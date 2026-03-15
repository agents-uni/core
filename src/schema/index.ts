import Ajv from 'ajv';
import universeSchema from './universe.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, verbose: true, validateSchema: false });

const validateUniverse = ajv.compile(universeSchema);

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

export function validateUniverseSpec(data: unknown): ValidationResult {
  const valid = validateUniverse(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validateUniverse.errors ?? []).map(err => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
    keyword: err.keyword,
  }));

  return { valid: false, errors };
}

export { universeSchema };
