/**
 * Spec Compiler — transforms a parsed YAML spec into a live Universe.
 */

import type { UniverseConfig } from '../types/index.js';
import { Universe } from '../core/universe.js';
import { validateSpec } from './validator.js';

export interface CompileOptions {
  /** Skip validation (for trusted specs) */
  skipValidation?: boolean;
  /** Auto-initialize the universe after compilation */
  autoInit?: boolean;
}

/**
 * Compile a UniverseConfig into a live Universe instance.
 */
export async function compileUniverse(
  config: UniverseConfig,
  options: CompileOptions = {}
): Promise<Universe> {
  // Validate unless explicitly skipped
  if (!options.skipValidation) {
    const result = validateSpec(config);
    if (!result.valid) {
      const errorMsg = result.errors
        .map(e => `  ${e.path}: ${e.message}`)
        .join('\n');
      throw new Error(`Universe spec validation failed:\n${errorMsg}`);
    }
  }

  const universe = new Universe(config);

  if (options.autoInit) {
    await universe.initialize();
  }

  return universe;
}
