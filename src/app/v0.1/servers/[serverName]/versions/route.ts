import { NextRequest, NextResponse } from 'next/server';
import { listServerVersions } from '@/lib/registry';

/**
 * GET /v0.1/servers/{serverName}/versions
 * List all versions of a server (MCP Registry v0.1 style).
 * serverName must be URL-encoded if it contains a slash (e.g. com.example%2Fmy-server).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serverName: string }> }
) {
  try {
    const { serverName } = await context.params;
    const result = await listServerVersions(serverName);
    if (result == null) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }
    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list server versions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
