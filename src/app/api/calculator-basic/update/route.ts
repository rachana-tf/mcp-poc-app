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

export async function PATCH(request: NextRequest) {
  // Validate Bearer token
  if (!validateBearer(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid or missing Bearer token' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { value, operation, operand } = body;

    if (typeof value !== 'number') {
      return NextResponse.json(
        { error: 'value must be a number' },
        { status: 400 }
      );
    }

    if (typeof operand !== 'number') {
      return NextResponse.json(
        { error: 'operand must be a number' },
        { status: 400 }
      );
    }

    if (!operation || typeof operation !== 'string') {
      return NextResponse.json(
        { error: 'operation must be a string (add, subtract, multiply, divide)' },
        { status: 400 }
      );
    }

    let result: number;
    switch (operation.toLowerCase()) {
      case 'add':
        result = value + operand;
        break;
      case 'subtract':
        result = value - operand;
        break;
      case 'multiply':
        result = value * operand;
        break;
      case 'divide':
        if (operand === 0) {
          return NextResponse.json(
            { error: 'Division by zero is not allowed' },
            { status: 400 }
          );
        }
        result = value / operand;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid operation. Must be one of: add, subtract, multiply, divide' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { 
        result,
        previousValue: value,
        operation: operation.toLowerCase(),
        operand
      },
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
      'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

