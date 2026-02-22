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
export interface ListServersResult {
  servers: Array<{ server: unknown; _meta?: Record<string, unknown> }>;
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
    const detail = await getServerVersion(encodeURIComponent(e.name), e.version);
    if (detail != null) {
      servers.push({
        server: detail,
        _meta: {
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
  const filename = entry.file ?? DEFAULT_SERVER_FILE;
  const serverJson = await loadServerJsonFile(filename);
  const server = serverJson as { name?: string; version?: string };
  if (server.name !== decodedName || server.version !== resolvedVersion) {
    return { ...server, name: decodedName, version: resolvedVersion };
  }
  return serverJson;
}
