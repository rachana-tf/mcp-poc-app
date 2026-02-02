// Dynamic API route to serve OpenAPI specs (no authentication required)

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Allowed OpenAPI spec files
const ALLOWED_SPECS = ['openapi1', 'openapi2', 'openapi3'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  // Validate spec name to prevent path traversal
  if (!ALLOWED_SPECS.includes(name)) {
    return NextResponse.json(
      { error: `Invalid spec name. Available: ${ALLOWED_SPECS.join(', ')}` },
      { status: 404 }
    );
  }

  try {
    // Try JSON first, then YAML, then file without extension
    const jsonPath = path.join(process.cwd(), `${name}.json`);
    const yamlPath = path.join(process.cwd(), `${name}.yaml`);
    const ymlPath = path.join(process.cwd(), `${name}.yml`);
    const noExtPath = path.join(process.cwd(), name);
    
    // Try JSON file
    try {
      const jsonContent = await fs.readFile(jsonPath, 'utf-8');
      const spec = JSON.parse(jsonContent);
      return NextResponse.json(spec, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (jsonError) {
      // Try YAML files - return as raw YAML
      try {
        const yamlContent = await fs.readFile(yamlPath, 'utf-8');
        return new NextResponse(yamlContent, {
          headers: {
            'Content-Type': 'text/yaml',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } catch (yamlError) {
        try {
          const ymlContent = await fs.readFile(ymlPath, 'utf-8');
          return new NextResponse(ymlContent, {
            headers: {
              'Content-Type': 'text/yaml',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        } catch (ymlError) {
          // Try file without extension (assume YAML) - return as raw YAML
          try {
            const noExtContent = await fs.readFile(noExtPath, 'utf-8');
            return new NextResponse(noExtContent, {
              headers: {
                'Content-Type': 'text/yaml',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
              },
            });
          } catch (noExtError) {
            return NextResponse.json(
              { error: `OpenAPI spec not found: ${name}.json, ${name}.yaml, ${name}.yml, or ${name}` },
              { status: 404 }
            );
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to read OpenAPI spec';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
