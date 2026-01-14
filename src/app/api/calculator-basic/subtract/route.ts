import { NextRequest, NextResponse } from 'next/server';

function validateBearer(request: NextRequest): boolean {
  const validToken = process.env.CALCULATOR_BEARER_TOKEN;
  if (!validToken) {
    console.warn('CALCULATOR_BEARER_TOKEN not set');
    return false;
  }
  
  const authHeader = request.headers.get('Authorization');
  console.log('Received Authorization header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('No valid Bearer prefix found');
    return false;
  }
  const token = authHeader.substring(7);
  console.log('Received token:', token);
  console.log('Expected token:', validToken);
  console.log('Token match:', token === validToken);
  return token === validToken;
}

export async function POST(request: NextRequest) {
  // Validate Bearer token
  if (!validateBearer(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing Bearer token' },
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

    const result = a - b;

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

