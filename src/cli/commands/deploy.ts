import chalk from 'chalk';
import { resolve } from 'node:path';
import { parseSpecFile } from '../../spec/parser.js';
import { deployToOpenClaw } from '../../bridge/openclaw-adapter.js';

export function deployCommand(
  file: string,
  opts: { dryRun?: boolean; dir?: string; lang?: string }
): void {
  try {
    const config = parseSpecFile(file);

    console.log(chalk.blue(`Deploying ${config.name} to OpenClaw...`));

    const result = deployToOpenClaw(config, {
      dryRun: opts.dryRun,
      openclawDir: opts.dir,
      specPath: resolve(file),
      soulOptions: {
        language: (opts.lang as 'zh' | 'en') ?? 'zh',
        includeRelationships: true,
        includePermissions: true,
      },
    });

    if (opts.dryRun) {
      console.log(chalk.yellow('DRY RUN — no files written'));
    }

    console.log(chalk.green(`\n✓ Deployed ${result.agents.length} agents:`));
    for (const agentId of result.agents) {
      console.log(chalk.gray(`  - ${agentId}`));
    }

    console.log(chalk.green(`\n✓ Generated ${result.files.length} files:`));
    for (const file of result.files) {
      console.log(chalk.gray(`  ${file.path}`));
    }

    if (result.registered.length > 0) {
      console.log(chalk.green(`\n✓ Registered ${result.registered.length} agents in openclaw.json:`));
      for (const agentId of result.registered) {
        console.log(chalk.gray(`  - ${agentId}`));
      }
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`\n⚠ ${result.warnings.length} warning(s):`));
      for (const w of result.warnings) {
        console.log(chalk.yellow(`  - ${w}`));
      }
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}
