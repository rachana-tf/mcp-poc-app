import * as fs from 'fs/promises';
import * as path from 'path';

export interface RegistryEntry {
  name: string;
  version: string;
}

export interface RegistryIndex {
  entries: RegistryEntry[];
}

export interface ListServersResult {
  servers: Array<{ name: string; version: string }>;
  metadata: { count: number; nextCursor?: string };
}

const REGISTRY_INDEX_PATH = path.join(process.cwd(), 'registry-index.json');
const SERVER_JSON_PATH = path.join(process.cwd(), 'server.json');

let cachedIndex: RegistryIndex | null = null;
let cachedServerJson: unknown = undefined;

async function loadIndex(): Promise<RegistryIndex> {
  if (cachedIndex) return cachedIndex;
  const raw = await fs.readFile(REGISTRY_INDEX_PATH, 'utf-8');
  cachedIndex = JSON.parse(raw) as RegistryIndex;
  return cachedIndex;
}

async function loadServerJson(): Promise<unknown> {
  if (cachedServerJson !== undefined) return cachedServerJson;
  const raw = await fs.readFile(SERVER_JSON_PATH, 'utf-8');
  cachedServerJson = JSON.parse(raw);
  return cachedServerJson;
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

  return {
    servers: slice.map((e) => ({ name: e.name, version: e.version })),
    metadata: { count: slice.length, ...(nextCursor && { nextCursor }) },
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
  const serverJson = await loadServerJson();
  const server = serverJson as { name?: string; version?: string };
  if (server.name !== decodedName || server.version !== resolvedVersion) {
    return { ...server, name: decodedName, version: resolvedVersion };
  }
  return serverJson;
}
