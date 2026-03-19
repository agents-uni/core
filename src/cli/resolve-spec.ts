import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_SPEC = 'universe.yaml';

/**
 * Resolve the spec file path: use the given file, or fall back to
 * `universe.yaml` in the current directory.
 */
export function resolveSpecFile(file?: string): string {
  if (file) return resolve(file);

  const fallback = resolve(DEFAULT_SPEC);
  if (existsSync(fallback)) return fallback;

  console.error(
    `Error: no file specified and ${DEFAULT_SPEC} not found in current directory.`
  );
  process.exit(1);
}
