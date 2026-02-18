// API route to list available OpenAPI specs (no authentication required)

import { NextResponse } from 'next/server';

// Available OpenAPI specs
const AVAILABLE_SPECS = [
  { name: 'openapi1', url: '/api/openapi/openapi1' },
  { name: 'openapi2', url: '/api/openapi/openapi2' },
  { name: 'openapi3', url: '/api/openapi/openapi3' },
  { name: 'calculator-basic', url: '/api/openapi/calculator-basic' },
  { name: 'calculator-oauth', url: '/api/openapi/calculator-oauth' },
];

export async function GET() {
  // Return list of available specs
  return NextResponse.json({
    message: 'Available OpenAPI specifications',
    specs: AVAILABLE_SPECS,
    usage: 'Access individual specs at /api/openapi/{name}',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
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
