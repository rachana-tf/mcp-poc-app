'use client';

import { useState } from 'react';

interface Tool {
  name: string;
  description: string;
  method: string;
  path: string;
  inputSchema: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required: string[];
  };
  // Original values for reference when sending to API
  originalName?: string;
}

interface ToolsResponse {
  baseUrl: string;
  tools: Tool[];
  converter?: string;
}

type ConverterType = 'mcp-from-openapi' | 'openapi-mcp-generator';

interface ExecuteResponse {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
  // For MCP client responses
  result?: {
    content: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
}

type InputMode = 'url' | 'file';

export default function Home() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [specUrl, setSpecUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [spec, setSpec] = useState<object | null>(null);
  const [specText, setSpecText] = useState('');
  
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingToolIndex, setEditingToolIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [converter, setConverter] = useState<ConverterType>('mcp-from-openapi');
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [usedConverter, setUsedConverter] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState('');

  // Filter tools based on search query
  const filteredTools = tools.filter(tool => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      tool.name.toLowerCase().includes(query) ||
      tool.description?.toLowerCase().includes(query) ||
      tool.path?.toLowerCase().includes(query) ||
      tool.method?.toLowerCase().includes(query)
    );
  });

  const handleSpecTextChange = (text: string) => {
    setSpecText(text);
    if (!text.trim()) {
      setSpec(null);
      setError(null);
      return;
    }
    
    try {
      const json = JSON.parse(text);
      setSpec(json);
      
      // Try to extract base URL from servers array
      if (json.servers?.[0]?.url) {
        setBaseUrl(json.servers[0].url);
      }
      setError(null);
    } catch {
      setError('Invalid JSON format');
      setSpec(null);
    }
  };

  const handleUrlChange = (url: string) => {
    setSpecUrl(url);
    // Auto-fill base URL from spec URL (remove /openapi.json or similar)
    try {
      const urlObj = new URL(url);
      const basePath = urlObj.pathname.replace(/\/(openapi\.json|swagger\.json|api-docs)$/i, '');
      setBaseUrl(`${urlObj.origin}${basePath}`);
    } catch {
      // Invalid URL, ignore
    }
  };

  const fetchTools = async () => {
    setLoading(true);
    setError(null);
    setTools([]);
    setSelectedTool(null);
    setResult(null);
    setSelectedToolIds(new Set());
    setSearchQuery('');
    setGenerationTime(null);
    setUsedConverter(null);

    const startTime = performance.now();

    try {
      const payload: Record<string, unknown> = {
        action: 'list',
        baseUrl,
        converter,
        authToken: authToken || undefined,
      };

      if (inputMode === 'url') {
        if (!specUrl) {
          setError('Please enter an OpenAPI spec URL');
          setLoading(false);
          return;
        }
        payload.specUrl = specUrl;
      } else {
        if (!spec) {
          setError('Please upload an OpenAPI spec file');
          setLoading(false);
          return;
        }
        payload.spec = spec;
      }

      if (!baseUrl) {
        setError('Please enter a base URL');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to load tools');
        return;
      }

      const typedData = data as ToolsResponse;
      // Store original name for API calls
      setTools(typedData.tools.map(t => ({ ...t, originalName: t.name })));
      setGenerationTime(performance.now() - startTime);
      setUsedConverter(typedData.converter || converter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const executeTool = async () => {
    if (!selectedTool) return;
    setLoading(true);
    setError(null);

    try {
      const input: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(inputValues)) {
        if (value.trim()) {
          try {
            input[key] = JSON.parse(value);
          } catch {
            input[key] = value;
          }
        }
      }

      const payload: Record<string, unknown> = {
        action: 'execute',
        baseUrl,
        tool: selectedTool.originalName || selectedTool.name, // Use original name for API
        input,
        converter,
        authToken: authToken || undefined,
      };

      if (inputMode === 'url') {
        payload.specUrl = specUrl;
      } else {
        payload.spec = spec;
      }

      const res = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to execute tool');
        return;
      }

      setResult(data as ExecuteResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute tool');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingToolIndex(index);
    setEditName(tools[index].name);
    setEditDescription(tools[index].description || '');
  };

  const saveEdit = () => {
    if (editingToolIndex === null) return;
    
    const updatedTools = [...tools];
    updatedTools[editingToolIndex] = {
      ...updatedTools[editingToolIndex],
      name: editName.trim() || updatedTools[editingToolIndex].name,
      description: editDescription,
    };
    setTools(updatedTools);
    
    // Update selected tool if it was edited
    if (selectedTool?.originalName === updatedTools[editingToolIndex].originalName) {
      setSelectedTool(updatedTools[editingToolIndex]);
    }
    
    setEditingToolIndex(null);
    setEditName('');
    setEditDescription('');
  };

  const cancelEdit = () => {
    setEditingToolIndex(null);
    setEditName('');
    setEditDescription('');
  };

  const toggleToolSelection = (toolId: string) => {
    setSelectedToolIds(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const selectAllTools = () => {
    setSelectedToolIds(new Set(tools.map(t => t.originalName || t.name)));
  };

  const deselectAllTools = () => {
    setSelectedToolIds(new Set());
  };

  const saveSelectedTools = () => {
    const selectedTools = tools.filter(t => selectedToolIds.has(t.originalName || t.name));
    if (selectedTools.length === 0) {
      setError('No tools selected to save');
      return;
    }

    // Prepare tools for export (clean format)
    const exportData = selectedTools.map(t => ({
      name: t.name,
      description: t.description,
      originalName: t.originalName !== t.name ? t.originalName : undefined,
      method: t.method,
      path: t.path,
      inputSchema: t.inputSchema,
    }));

    // Download as JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcp-tools-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    DELETE: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    PATCH: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzFhMWEyZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            OpenAPI → MCP Converter
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            MCP Tool Generator
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400">
            Convert any OpenAPI specification into MCP tools. Paste JSON or provide a URL.
          </p>
        </header>

        {/* Main content */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left panel - Spec input & Tool selection */}
          <div className="space-y-6">
            {/* Spec input */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                OpenAPI Specification
              </h2>

              {/* Input mode toggle */}
              <div className="mb-4 flex rounded-xl border border-zinc-700 bg-zinc-800/50 p-1">
                <button
                  onClick={() => setInputMode('url')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    inputMode === 'url'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  🔗 From URL
                </button>
                <button
                  onClick={() => setInputMode('file')}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    inputMode === 'file'
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  📝 Paste JSON
                </button>
              </div>

              {inputMode === 'url' ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      OpenAPI Spec URL
                    </label>
                    <input
                      type="url"
                      value={specUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://api.example.com/openapi.json"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                      Paste OpenAPI JSON
                    </label>
                    <textarea
                      value={specText}
                      onChange={(e) => handleSpecTextChange(e.target.value)}
                      placeholder='{"openapi": "3.0.0", "info": {...}, "paths": {...}}'
                      rows={8}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-zinc-500">Paste your OpenAPI spec JSON here</p>
                      {spec && (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Valid JSON
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  API Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-zinc-500">Base URL for making API calls</p>
              </div>

              {/* Auth token input */}
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Auth Token <span className="text-zinc-500 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Bearer token or API key"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {authToken && (
                    <button
                      type="button"
                      onClick={() => setAuthToken('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {authToken 
                    ? '🔒 Token set - will be sent as Authorization header' 
                    : 'Add Bearer token or API key for authenticated APIs'}
                </p>
              </div>

              {/* Generator selector */}
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Generator
                </label>
                <div className="flex rounded-lg border border-zinc-700 bg-zinc-800/50 p-1">
                  <button
                    type="button"
                    onClick={() => setConverter('mcp-from-openapi')}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                      converter === 'mcp-from-openapi'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    mcp-from-openapi
                  </button>
                  <button
                    type="button"
                    onClick={() => setConverter('openapi-mcp-generator')}
                    className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                      converter === 'openapi-mcp-generator'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    openapi-mcp-generator
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {converter === 'mcp-from-openapi' 
                    ? 'Rich metadata, output schemas, security info' 
                    : 'Simpler output, built-in server support'}
                </p>
              </div>

              <button
                onClick={fetchTools}
                disabled={loading}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
            >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  '⚡ Generate MCP Tools'
                )}
              </button>
        </div>

            {/* Tools list */}
            {tools.length > 0 && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                <div className="mb-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Generated Tools
                    <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      {tools.length}
                    </span>
                  </h2>
                  {/* Generation stats */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {generationTime !== null && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {generationTime < 1000 
                          ? `${Math.round(generationTime)}ms`
                          : `${(generationTime / 1000).toFixed(2)}s`}
                      </span>
                    )}
                    {usedConverter && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-300">
                        {usedConverter}
                      </span>
                    )}
                  </div>
                </div>

                {/* Search input */}
                <div className="mb-3 relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tools by name, description, path..."
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Selection controls */}
                <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-zinc-400">
                      {selectedToolIds.size} of {tools.length} selected
                      {searchQuery && ` (${filteredTools.length} shown)`}
                    </span>
                    <button
                      onClick={selectedToolIds.size === tools.length ? deselectAllTools : selectAllTools}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {selectedToolIds.size === tools.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <button
                    onClick={saveSelectedTools}
                    disabled={selectedToolIds.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Save Selected
                  </button>
                </div>
                <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
                  {filteredTools.length === 0 ? (
                    <div className="py-8 text-center text-zinc-500">
                      <svg className="mx-auto mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      No tools match &quot;{searchQuery}&quot;
                    </div>
                  ) : filteredTools.map((tool, index) => (
                    <div
                      key={tool.originalName || tool.name}
                      className={`rounded-xl border p-4 transition-all ${
                        selectedTool?.originalName === tool.originalName
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/50'
                      }`}
                    >
                      {editingToolIndex === index ? (
                        // Edit mode
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Tool Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                              placeholder="Tool name"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-400">Tool Description</label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none resize-none"
                              placeholder="Tool description"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                            >
                              ✓ Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex-1 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-600"
                            >
                              ✕ Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedToolIds.has(tool.originalName || tool.name)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleToolSelection(tool.originalName || tool.name);
                              }}
                              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                            />
                          </div>
                          
                          {/* Tool content */}
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedTool(tool);
                              setInputValues({});
                              setResult(null);
                            }}
                          >
                            {/* Method + Path */}
                            <div className="flex items-center gap-2">
                              <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${methodColors[tool.method] || 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30'}`}>
                                {tool.method || 'API'}
                              </span>
                              <code className="flex-1 font-mono text-sm text-cyan-400">{tool.path || '/'}</code>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(index);
                                }}
                                className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-400"
                                title="Edit tool name and description"
                              >
                                ✎ Edit
                              </button>
                            </div>
                            {/* Tool Name */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Tool:</span>
                              <span className="font-mono text-sm font-medium text-zinc-200">{tool.name}</span>
                              {tool.originalName !== tool.name && (
                                <span className="text-xs text-amber-500/70">(was: {tool.originalName})</span>
                              )}
                            </div>
                            {/* Description */}
                            <p className="mt-1 text-sm text-zinc-500">{tool.description || 'No description'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right panel - Tool details & execution */}
          <div className="space-y-6">
            {selectedTool ? (
              <>
                {/* Tool input */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {selectedTool.name}
                  </h2>
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${methodColors[selectedTool.method]}`}>
                      {selectedTool.method}
                    </span>
                    <span className="font-mono text-sm text-zinc-400">{selectedTool.path}</span>
                  </div>

                  {Object.keys(selectedTool.inputSchema.properties || {}).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(selectedTool.inputSchema.properties).map(([key, prop]) => (
                        <div key={key}>
                          <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-300">
                            {key}
                            {selectedTool.inputSchema.required?.includes(key) && (
                              <span className="text-rose-400">*</span>
                            )}
                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">
                              {prop.type}
                            </span>
                          </label>
                          {prop.description && (
                            <p className="mb-2 text-xs text-zinc-500">{prop.description}</p>
                          )}
                          <input
                            type="text"
                            value={inputValues[key] || ''}
                            onChange={(e) => setInputValues({ ...inputValues, [key]: e.target.value })}
                            placeholder={key === 'body' ? '{"key": "value"}' : `Enter ${key}`}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">No parameters required</p>
                  )}

                  <button
                    onClick={executeTool}
                    disabled={loading}
                    className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
                  >
                    {loading ? 'Executing...' : '▶ Execute Tool'}
                  </button>
                </div>

                {/* Result */}
                {result && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-100">
                      <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Result
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        (result.isError ?? result.result?.isError)
                          ? 'bg-rose-500/20 text-rose-300' 
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {(result.isError ?? result.result?.isError) ? 'Error' : 'Success'}
                      </span>
                    </h2>
                    <pre className="max-h-[400px] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-sm text-zinc-300">
                      {result.content?.[0]?.text ?? result.result?.content?.[0]?.text ?? 'No content'}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-12">
                <div className="text-center">
                  <svg className="mx-auto mb-4 h-12 w-12 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-zinc-500">
                    {tools.length > 0
                      ? 'Select a tool to view details and execute'
                      : 'Load an OpenAPI spec to generate tools'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error toast */}
        {error && (
          <div className="fixed bottom-6 right-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-rose-300 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
              <button onClick={() => setError(null)} className="ml-4 text-rose-400 hover:text-rose-300">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
