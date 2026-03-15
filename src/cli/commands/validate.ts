import chalk from 'chalk';
import { parseSpecFile } from '../../spec/parser.js';
import { validateSpec } from '../../spec/validator.js';

export function validateCommand(file: string): void {
  try {
    console.log(chalk.blue(`Validating ${file}...`));

    const config = parseSpecFile(file);
    const result = validateSpec(config);

    if (result.valid) {
      console.log(chalk.green('✓ Valid universe spec'));
      console.log(chalk.gray(`  Name: ${config.name}`));
      console.log(chalk.gray(`  Type: ${config.type}`));
      console.log(chalk.gray(`  Agents: ${config.agents.length}`));
      console.log(chalk.gray(`  Relationships: ${config.relationships.length}`));
      console.log(chalk.gray(`  Protocols: ${config.protocols.length}`));
    } else {
      console.log(chalk.red(`✗ Invalid spec — ${result.errors.length} error(s):`));
      for (const err of result.errors) {
        console.log(chalk.red(`  ${err.path}: ${err.message} [${err.keyword}]`));
      }
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}
