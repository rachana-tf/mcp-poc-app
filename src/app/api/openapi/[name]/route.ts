// Dynamic API route to serve OpenAPI specs (no authentication required)

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// Allowed OpenAPI spec files
const ALLOWED_SPECS = ['openapi1', 'openapi2'];

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
    // Read and return the OpenAPI spec
    const specPath = path.join(process.cwd(), `${name}.json`);
    const specContent = await fs.readFile(specPath, 'utf-8');
    const spec = JSON.parse(specContent);

    return NextResponse.json(spec, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
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
