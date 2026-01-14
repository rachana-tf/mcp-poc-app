import { NextRequest, NextResponse } from 'next/server';

// In a real implementation, you would validate the OAuth token against your OAuth provider
// This is a simplified example that checks for a valid Bearer token format
function validateOAuth(request: NextRequest): { valid: boolean; error?: string } {
  const authHeader = request.headers.get('Authorization');
  console.log('Received Authorization header:', authHeader);
  
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid Authorization format. Expected Bearer token' };
  }
  
  const token = authHeader.substring(7);
  console.log('Received OAuth token:', token);
  
  // In production, you would:
  // 1. Validate the token with your OAuth provider
  // 2. Check token expiration
  // 3. Verify required scopes (calculator:read, calculator:write)
  
  if (!token || token.length < 10) {
    return { valid: false, error: 'Invalid OAuth token' };
  }
  
  // Simulated scope check - in production, decode JWT or call introspection endpoint
  // For demo purposes, accept any token with length >= 10
  return { valid: true };
}

export async function POST(request: NextRequest) {
  // Validate OAuth token
  const authResult = validateOAuth(request);
  
  if (!authResult.valid) {
    return NextResponse.json(
      { error: `Unauthorized - ${authResult.error}` },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { a, b } = body;

    if (typeof a !== 'number' || typeof b !== 'number') {
      return NextResponse.json(
        { error: 'Both a and b must be numbers' },
        { status: 400 }
      );
    }

    const result = a * b;

    return NextResponse.json(
      { result },
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

