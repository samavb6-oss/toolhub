const CHUNK_LOAD_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /loading chunk [\w-]+ failed/i,
  /vite:preloaderror/i,
];

export function isChunkLoadError(error: Error): boolean {
  return CHUNK_LOAD_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}
