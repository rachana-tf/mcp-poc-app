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

async function handleAdd(request: NextRequest) {
  // Validate Bearer token
  if (!validateBearer(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing Bearer token' },
      { status: 401 }
    );
  }

  try {
    // Get parameters from query (for GET/HEAD/DELETE) or body (for POST/PUT/PATCH)
    const url = new URL(request.url);
    let a: number, b: number;

    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'DELETE') {
      const aParam = url.searchParams.get('a');
      const bParam = url.searchParams.get('b');
      
      if (!aParam || !bParam) {
        return NextResponse.json(
          { error: 'Both a and b query parameters are required' },
          { status: 400 }
        );
      }
      
      a = parseFloat(aParam);
      b = parseFloat(bParam);
    } else {
      const body = await request.json();
      a = body.a;
      b = body.b;
    }

    if (typeof a !== 'number' || isNaN(a) || typeof b !== 'number' || isNaN(b)) {
      return NextResponse.json(
        { error: 'Both a and b must be valid numbers' },
        { status: 400 }
      );
    }

    const result = a + b;

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
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleAdd(request);
}

export async function POST(request: NextRequest) {
  return handleAdd(request);
}

export async function PUT(request: NextRequest) {
  return handleAdd(request);
}

export async function PATCH(request: NextRequest) {
  return handleAdd(request);
}

export async function DELETE(request: NextRequest) {
  return handleAdd(request);
}

export async function HEAD(request: NextRequest) {
  const response = await handleAdd(request);
  // HEAD should return same headers but no body
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

