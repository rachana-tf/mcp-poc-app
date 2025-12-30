// API route for MCP tool operations

import { NextRequest, NextResponse } from 'next/server';
import { createGenerator, executeTool } from '@/lib/mcp-from-openapi';
import { getToolsFromOpenApi, McpToolDefinition } from 'openapi-mcp-generator';
import * as fs from 'fs/promises';
import * as path from 'path';

type ConverterType = 'mcp-from-openapi' | 'openapi-mcp-generator';

export async function POST(request: NextRequest) {
  try {
    const {
      action,
      spec,
      specUrl,
      baseUrl,
      tool: toolName,
      input = {},
      converter = 'mcp-from-openapi' as ConverterType,
      authToken,
    } = await request.json();

    // Load OpenAPI spec
    if (!specUrl && !spec) {
      return NextResponse.json({ error: 'Either spec or specUrl required' }, { status: 400 });
    }

    // Log and save tools file path
    const toolsFilePath = path.join(process.cwd(), 'tools-output.json');

    if (converter === 'openapi-mcp-generator') {
      // Use openapi-mcp-generator
      const tools: McpToolDefinition[] = await getToolsFromOpenApi(specUrl || spec, { baseUrl });
      
      // Save only essential fields to reduce file size
      const toolsToSave = tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        path: t.pathTemplate,
        method: t.method,
        executionParameters: t.executionParameters,
      }));
      console.log('Tools from openapi-mcp-generator:', JSON.stringify(toolsToSave, null, 2));
      // await fs.writeFile(toolsFilePath, JSON.stringify(toolsToSave, null, 2), 'utf-8');
      await fs.writeFile(toolsFilePath, JSON.stringify(toolsToSave), 'utf-8');

      if (action === 'list') {
        return NextResponse.json({
          baseUrl,
          converter: 'openapi-mcp-generator',
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            path: t.pathTemplate,
            method: t.method?.toUpperCase(),
          })),
        });
      }

      if (action === 'execute') {
        if (!toolName) {
          return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
        }

        // Find tool and execute using openapi-mcp-generator format
        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          return NextResponse.json({
            content: [{ type: 'text', text: `Tool "${toolName}" not found` }],
            isError: true,
          });
        }

        // Build request from tool definition
        let url = (baseUrl || '') + tool.pathTemplate;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        
        // Add auth token if provided
        if (authToken) {
          headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
        }
        
        const queryParams: Record<string, string> = {};
        let body: unknown = null;

        for (const param of tool.executionParameters) {
          const value = input[param.name];
          if (value === undefined) continue;

          switch (param.in) {
            case 'path':
              url = url.replace(`{${param.name}}`, encodeURIComponent(String(value)));
              break;
            case 'query':
              queryParams[param.name] = String(value);
              break;
            case 'header':
              headers[param.name] = String(value);
              break;
            case 'body':
              body = value;
              break;
          }
        }

        // Handle request body if not set via executionParameters
        if (!body && tool.requestBodyContentType && Object.keys(input).length > 0) {
          body = input;
        }

        const queryString = new URLSearchParams(queryParams).toString();
        if (queryString) url += `?${queryString}`;

        const response = await fetch(url, {
          method: tool.method.toUpperCase(),
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        const contentType = response.headers.get('content-type');
        let resultText: string;
        if (contentType?.includes('application/json')) {
          const data = await response.json();
          resultText = JSON.stringify(data, null, 2);
        } else {
          resultText = await response.text();
        }

        return NextResponse.json({
          content: [{ type: 'text', text: resultText }],
          isError: !response.ok,
        });
      }
    } else {
      // Use mcp-from-openapi (default)
      const generator = await createGenerator(specUrl || spec, baseUrl);
      const tools = await generator.generateTools();

      // Save only essential fields to reduce file size
      const toolsToSave = tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        outputSchema: t.outputSchema,
        mapper: t.mapper,
        path: t.metadata?.path,
        method: t.metadata?.method,
      }));
      console.log('Tools from mcp-from-openapi:', JSON.stringify(toolsToSave, null, 2));
      // await fs.writeFile(toolsFilePath, JSON.stringify(toolsToSave, null, 2), 'utf-8');
      await fs.writeFile(toolsFilePath, JSON.stringify(toolsToSave), 'utf-8');

      const effectiveBaseUrl = baseUrl || generator.getDocument().servers?.[0]?.url || '';

      if (action === 'list') {
        return NextResponse.json({
          baseUrl: effectiveBaseUrl,
          converter: 'mcp-from-openapi',
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            path: t.metadata?.path,
            method: t.metadata?.method?.toUpperCase(),
          })),
        });
      }

      if (action === 'execute') {
        if (!toolName) {
          return NextResponse.json({ error: 'Tool name required' }, { status: 400 });
        }

        const result = await executeTool(tools, toolName, input, effectiveBaseUrl, authToken);
        return NextResponse.json(result);
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use "list" or "execute"' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
