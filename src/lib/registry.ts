import * as fs from 'fs/promises';
import * as path from 'path';

export interface RegistryEntry {
  name: string;
  version: string;
  /** Optional server JSON filename (default "server.json"). */
  file?: string;
}

export interface RegistryIndex {
  entries: RegistryEntry[];
}

/** MCP Registry API: each list item is ServerResponse (server + optional _meta). */
export interface ServerResponse {
  server: unknown;
  _meta?: Record<string, unknown>;
}

export interface ListServersResult {
  servers: ServerResponse[];
  metadata: { count: number; nextCursor?: string };
}

const REGISTRY_INDEX_PATH = path.join(process.cwd(), 'registry-index.json');
const DEFAULT_SERVER_FILE = 'server.json';

let cachedIndex: RegistryIndex | null = null;
const serverJsonCache = new Map<string, unknown>();

async function loadIndex(): Promise<RegistryIndex> {
  if (cachedIndex) return cachedIndex;
  const raw = await fs.readFile(REGISTRY_INDEX_PATH, 'utf-8');
  cachedIndex = JSON.parse(raw) as RegistryIndex;
  return cachedIndex;
}

async function loadServerJsonFile(filename: string): Promise<unknown> {
  const cached = serverJsonCache.get(filename);
  if (cached !== undefined) return cached;
  const filePath = path.join(process.cwd(), filename);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  serverJsonCache.set(filename, parsed);
  return parsed;
}

/**
 * Resolve a registry entry to a ServerResponse.
 * The entry's file may be either:
 * - a single server.json (bare server object), or
 * - a registry list response ({ servers: [{ server, _meta }, ...] }), in which
 *   case the matching server is looked up by name + version and its _meta preserved.
 */
async function resolveServerResponse(
  entry: RegistryEntry
): Promise<ServerResponse | null> {
  const filename = entry.file ?? DEFAULT_SERVER_FILE;
  const json = (await loadServerJsonFile(filename)) as {
    servers?: Array<{ server?: { name?: string; version?: string }; _meta?: Record<string, unknown> }>;
    name?: string;
    version?: string;
  };

  if (Array.isArray(json.servers)) {
    const match = json.servers.find(
      (s) => s.server?.name === entry.name && s.server?.version === entry.version
    );
    if (!match) return null;
    return { server: match.server, ...(match._meta && { _meta: match._meta }) };
  }

  if (json.name !== entry.name || json.version !== entry.version) {
    return { server: { ...json, name: entry.name, version: entry.version } };
  }
  return { server: json };
}

export async function listServers(options: {
  limit?: number;
  cursor?: string;
  updated_since?: string;
}): Promise<ListServersResult> {
  const index = await loadIndex();
  const limit = Math.min(Math.max(1, options.limit ?? 30), 100);
  let start = 0;

  if (options.cursor) {
    const cursorIndex = index.entries.findIndex(
      (e) => `${e.name}:${e.version}` === options.cursor
    );
    if (cursorIndex >= 0) start = cursorIndex + 1;
  }

  const slice = index.entries.slice(start, start + limit);
  const hasNext = start + slice.length < index.entries.length;
  const nextCursor =
    hasNext && slice.length > 0
      ? `${slice[slice.length - 1].name}:${slice[slice.length - 1].version}`
      : undefined;

  const servers: ListServersResult['servers'] = [];
  for (const e of slice) {
    const response = await resolveServerResponse(e);
    if (response != null) {
      servers.push({
        server: response.server,
        _meta: response._meta ?? {
          'io.modelcontextprotocol.registry/official': {
            status: 'active',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  return {
    servers,
    metadata: { count: servers.length, ...(nextCursor && { nextCursor }) },
  };
}

/**
 * List all versions of a server (MCP Registry v0.1:
 * GET /v0.1/servers/{serverName}/versions).
 * serverName may be URL-encoded (e.g. com.example%2Fmy-server).
 * Returns null when the server is not in the registry.
 */
export async function listServerVersions(
  serverName: string
): Promise<ListServersResult | null> {
  const decodedName = decodeURIComponent(serverName);
  const index = await loadIndex();
  const entries = index.entries
    .filter((e) => e.name === decodedName)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  if (entries.length === 0) return null;

  const servers: ListServersResult['servers'] = [];
  for (const entry of entries) {
    const response = await resolveServerResponse(entry);
    if (response != null) {
      servers.push({
        server: response.server,
        _meta: response._meta ?? {
          'io.modelcontextprotocol.registry/official': {
            status: 'active',
            isLatest: entry === entries[0],
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  return { servers, metadata: { count: servers.length } };
}

export async function getServerVersion(
  serverName: string,
  version: string
): Promise<unknown | null> {
  const decodedName = decodeURIComponent(serverName);
  const index = await loadIndex();
  const resolvedVersion =
    version === 'latest'
      ? index.entries
          .filter((e) => e.name === decodedName)
          .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0]?.version
      : version;
  if (!resolvedVersion) return null;
  const entry = index.entries.find(
    (e) => e.name === decodedName && e.version === resolvedVersion
  );
  if (!entry) return null;
  const response = await resolveServerResponse(entry);
  return response?.server ?? null;
}
