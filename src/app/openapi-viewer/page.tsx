'use client';

import { useState, useEffect } from 'react';

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, PathOperation>>;
  components?: {
    schemas?: Record<string, Schema>;
  };
}

interface PathOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, Response>;
  tags?: string[];
}

interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  schema?: Schema;
  description?: string;
}

interface RequestBody {
  content?: Record<string, { schema?: Schema }>;
  required?: boolean;
}

interface Response {
  description: string;
  content?: Record<string, { schema?: Schema }>;
}

interface Schema {
  type?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  $ref?: string;
  title?: string;
  required?: string[];
  anyOf?: Schema[];
  additionalProperties?: Schema | boolean;
}

export default function OpenAPIViewer() {
  const [token, setToken] = useState('');
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const methodColors: Record<string, { bg: string; text: string; border: string }> = {
    get: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    post: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
    put: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    delete: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
    patch: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30' },
  };

  const fetchSpec = async () => {
    if (!token.trim()) {
      setError('Please enter an authentication token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openapi', {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setSpec(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch OpenAPI spec');
      setSpec(null);
    } finally {
      setLoading(false);
    }
  };

  const togglePath = (pathKey: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(pathKey)) {
        next.delete(pathKey);
      } else {
        next.add(pathKey);
      }
      return next;
    });
  };

  const renderSchema = (schema: Schema | undefined, depth = 0): React.ReactNode => {
    if (!schema) return <span className="text-zinc-500">any</span>;

    if (schema.$ref) {
      const refName = schema.$ref.split('/').pop();
      return <span className="text-violet-400">{refName}</span>;
    }

    if (schema.anyOf) {
      return (
        <span>
          {schema.anyOf.map((s, i) => (
            <span key={i}>
              {i > 0 && <span className="text-zinc-500"> | </span>}
              {renderSchema(s, depth)}
            </span>
          ))}
        </span>
      );
    }

    if (schema.type === 'array' && schema.items) {
      return <span>{renderSchema(schema.items, depth)}[]</span>;
    }

    if (schema.type === 'object' && schema.properties) {
      return (
        <span className="text-amber-400">
          {'{ '}
          {Object.entries(schema.properties).map(([key, prop], i) => (
            <span key={key}>
              {i > 0 && ', '}
              <span className="text-zinc-300">{key}</span>: {renderSchema(prop, depth + 1)}
            </span>
          ))}
          {' }'}
        </span>
      );
    }

    const typeColors: Record<string, string> = {
      string: 'text-green-400',
      number: 'text-cyan-400',
      integer: 'text-cyan-400',
      boolean: 'text-orange-400',
      object: 'text-amber-400',
      array: 'text-pink-400',
    };

    return <span className={typeColors[schema.type || ''] || 'text-zinc-400'}>{schema.type || 'any'}</span>;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-zinc-100">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">OpenAPI Viewer</h1>
              <p className="text-zinc-500">Authenticated API Documentation</p>
            </div>
          </div>
          
          {/* Auth form */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Bearer Token
              </span>
            </label>
            <div className="flex gap-3">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchSpec()}
                placeholder="Enter your authentication token"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={fetchSpec}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
              >
                {loading ? (
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  'Load Spec'
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Token is required to access the protected OpenAPI specification
            </p>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-400">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Spec display */}
        {spec && (
          <div className="space-y-6">
            {/* API Info */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{spec.info.title}</h2>
                  <p className="mt-1 text-zinc-400">{spec.info.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-800 px-3 py-1 text-sm text-zinc-400">
                    v{spec.info.version}
                  </span>
                  <span className="rounded-lg bg-emerald-500/20 px-3 py-1 text-sm text-emerald-400">
                    OpenAPI {spec.openapi}
                  </span>
                </div>
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-zinc-200">Endpoints</h3>
              
              {Object.entries(spec.paths).map(([path, methods]) => (
                <div key={path} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  {Object.entries(methods).map(([method, operation]) => {
                    const pathKey = `${method}-${path}`;
                    const isExpanded = expandedPaths.has(pathKey);
                    const colors = methodColors[method] || { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' };
                    
                    return (
                      <div key={pathKey} className="border-b border-zinc-800 last:border-b-0">
                        {/* Header */}
                        <button
                          onClick={() => togglePath(pathKey)}
                          className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-zinc-800/30"
                        >
                          <span className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border}`}>
                            {method}
                          </span>
                          <code className="flex-1 font-mono text-sm text-zinc-200">{path}</code>
                          <span className="text-sm text-zinc-500">{operation.summary}</span>
                          <svg
                            className={`h-5 w-5 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="border-t border-zinc-800 bg-zinc-950/50 p-6 space-y-6">
                            {operation.description && (
                              <p className="text-sm text-zinc-400">{operation.description}</p>
                            )}

                            {/* Parameters */}
                            {operation.parameters && operation.parameters.length > 0 && (
                              <div>
                                <h4 className="mb-3 text-sm font-semibold text-zinc-300">Parameters</h4>
                                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-zinc-800/50">
                                      <tr>
                                        <th className="px-4 py-2 text-left font-medium text-zinc-400">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-zinc-400">In</th>
                                        <th className="px-4 py-2 text-left font-medium text-zinc-400">Type</th>
                                        <th className="px-4 py-2 text-left font-medium text-zinc-400">Required</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {operation.parameters.map((param, i) => (
                                        <tr key={i} className="border-t border-zinc-800">
                                          <td className="px-4 py-3">
                                            <code className="text-cyan-400">{param.name}</code>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                                              {param.in}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 font-mono text-xs">
                                            {renderSchema(param.schema)}
                                          </td>
                                          <td className="px-4 py-3">
                                            {param.required ? (
                                              <span className="text-rose-400">required</span>
                                            ) : (
                                              <span className="text-zinc-500">optional</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Responses */}
                            {operation.responses && (
                              <div>
                                <h4 className="mb-3 text-sm font-semibold text-zinc-300">Responses</h4>
                                <div className="space-y-2">
                                  {Object.entries(operation.responses).map(([code, response]) => (
                                    <div
                                      key={code}
                                      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3"
                                    >
                                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                                        code.startsWith('2') ? 'bg-emerald-500/20 text-emerald-400' :
                                        code.startsWith('4') ? 'bg-amber-500/20 text-amber-400' :
                                        code.startsWith('5') ? 'bg-rose-500/20 text-rose-400' :
                                        'bg-zinc-500/20 text-zinc-400'
                                      }`}>
                                        {code}
                                      </span>
                                      <span className="text-sm text-zinc-400">{response.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Schemas */}
            {spec.components?.schemas && Object.keys(spec.components.schemas).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-200">Schemas</h3>
                
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
                  {Object.entries(spec.components.schemas).map(([name, schema]) => (
                    <div key={name} className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-4">
                      <h4 className="mb-2 font-mono text-violet-400">{name}</h4>
                      <pre className="overflow-x-auto text-xs text-zinc-400">
                        {JSON.stringify(schema, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!spec && !loading && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 py-20">
            <svg className="mb-4 h-16 w-16 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-zinc-500">Enter your bearer token to view the API documentation</p>
          </div>
        )}
      </div>
    </div>
  );
}

