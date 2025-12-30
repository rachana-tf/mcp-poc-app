// MCP from OpenAPI - Tool Generator and Request Builder
// Uses mcp-from-openapi package

import { OpenAPIToolGenerator, McpOpenAPITool } from 'mcp-from-openapi';

export interface MCPToolOutput {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

/**
 * Execute a tool by name
 * 1. Find tool and build HTTP request using mapper
 * 2. Execute fetch
 * 3. Convert response to MCP output
 */
export async function executeTool(
  tools: McpOpenAPITool[],
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  authToken?: string
): Promise<MCPToolOutput> {
  // Find tool
  const tool = tools.find((t) => t.name === toolName);
  if (!tool) {
      return {
      content: [{ type: 'text', text: `Tool "${toolName}" not found` }],
      isError: true,
      };
}

  // 1. Build HTTP Request from tool mapper
  let url = baseUrl + tool.metadata.path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Add auth token if provided
  if (authToken) {
    headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
  }
  
  const queryParams: Record<string, string> = {};
  let body: unknown = null;

  for (const mapping of tool.mapper) {
    const value = input[mapping.inputKey];
    if (value === undefined) continue;
    
    switch (mapping.type) {
      case 'path':
        url = url.replace(`{${mapping.key}}`, encodeURIComponent(String(value)));
        break;
      case 'query':
        queryParams[mapping.key] = String(value);
        break;
      case 'header':
        headers[mapping.key] = String(value);
        break;
      case 'body':
        body = value;
        break;
    }
  }

  const queryString = new URLSearchParams(queryParams).toString();
  if (queryString) url += `?${queryString}`;

  // 2. Execute fetch
  const response = await fetch(url, {
    method: tool.metadata.method.toUpperCase(),
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 3. Convert response to MCP output
  const contentType = response.headers.get('content-type');
  let resultText: string;

  if (contentType?.includes('application/json')) {
    const data = await response.json();
    resultText = JSON.stringify(data, null, 2);
  } else {
    resultText = await response.text();
  }

  return {
    content: [{ type: 'text', text: resultText }],
    isError: !response.ok,
  };
}

/**
 * Create generator from spec URL or JSON object
 */
export async function createGenerator(
  specOrUrl: string | object,
  baseUrl?: string
): Promise<OpenAPIToolGenerator> {
  if (typeof specOrUrl === 'string') {
    return OpenAPIToolGenerator.fromURL(specOrUrl, { baseUrl, validate: true });
  }
  return OpenAPIToolGenerator.fromJSON(specOrUrl, { baseUrl, validate: true });
}
