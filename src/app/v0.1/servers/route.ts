import { NextRequest, NextResponse } from 'next/server';
import { listServers } from '@/lib/registry';

/**
 * GET /v0.1/servers
 * List all MCP servers (MCP Registry v0.1 style).
 * Query: limit (default 30), cursor, updated_since (RFC 3339)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const cursor = searchParams.get('cursor') ?? undefined;
    const updated_since = searchParams.get('updated_since') ?? undefined;

    const result = await listServers({
      limit: limit ? parseInt(limit, 10) : undefined,
      cursor,
      updated_since,
    });

    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list servers';
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
