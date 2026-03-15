#!/usr/bin/env node

/**
 * uni CLI — command-line tools for managing agent universes.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './commands/validate.js';
import { visualizeCommand } from './commands/visualize.js';
import { deployCommand } from './commands/deploy.js';
import { initCommand } from './commands/init.js';
import { inspectCommand } from './commands/inspect.js';
import { listUnis, getUni, cleanupUni, resetUni } from '../bridge/uni-registry.js';
import { startDashboard } from '../dashboard/server.js';

const program = new Command();

program
  .name('uni')
  .description('Agent Universe management CLI — define, validate, visualize, and deploy agent organizations')
  .version('0.1.0');

program
  .command('validate <file>')
  .description('Validate a universe YAML spec against the schema')
  .action(validateCommand);

program
  .command('visualize <file>')
  .description('Render an ASCII relationship graph of the universe')
  .action(visualizeCommand);

program
  .command('deploy <file>')
  .description('Deploy universe spec to OpenClaw workspaces (generate SOUL.md files)')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option('--dir <path>', 'OpenClaw base directory')
  .option('--lang <lang>', 'SOUL.md language (zh|en)', 'zh')
  .action(deployCommand);

program
  .command('init [name]')
  .description('Initialize a new universe project interactively')
  .action(initCommand);

program
  .command('inspect <file>')
  .description('Inspect a universe spec')
  .option('--agent <id>', 'Show details for a specific agent')
  .action(inspectCommand);

// ─── Dashboard ────────────────────────────────────

program
  .command('dashboard')
  .description('Start the Uni Dashboard web UI')
  .option('-p, --port <port>', 'Server port', '8089')
  .option('--dir <path>', 'OpenClaw base directory')
  .action(async (opts: { port: string; dir?: string }) => {
    await startDashboard({
      port: parseInt(opts.port, 10),
      openclawDir: opts.dir,
    });
  });

// ─── Multi-Uni Management ─────────────────────────

program
  .command('list')
  .description('List all registered universes')
  .option('--dir <path>', 'OpenClaw base directory')
  .action((opts: { dir?: string }) => {
    const unis = listUnis(opts.dir);
    if (unis.length === 0) {
      console.log(chalk.gray('No universes registered. Run `uni deploy <file>` to deploy one.'));
      return;
    }

    console.log(chalk.bold('\n🌌 Registered Universes\n'));
    console.log(chalk.gray('  ID                      Type           Agents  Version  Deployed'));
    console.log(chalk.gray('  ' + '─'.repeat(75)));

    for (const uni of unis) {
      const id = uni.id.padEnd(24);
      const type = uni.type.padEnd(14);
      const agents = String(uni.agentIds.length).padEnd(8);
      const version = ('v' + uni.version).padEnd(9);
      const date = new Date(uni.deployedAt).toLocaleDateString();
      console.log(`  ${chalk.cyan(id)} ${chalk.gray(type)} ${chalk.white(agents)} ${chalk.gray(version)} ${chalk.gray(date)}`);
    }
    console.log('');
  });

program
  .command('status')
  .description('Show deployment overview')
  .option('--dir <path>', 'OpenClaw base directory')
  .action((opts: { dir?: string }) => {
    const unis = listUnis(opts.dir);
    const totalAgents = unis.reduce((s, u) => s + u.agentIds.length, 0);
    const types = new Map<string, number>();
    for (const u of unis) {
      types.set(u.type, (types.get(u.type) ?? 0) + 1);
    }

    console.log(chalk.bold('\n🌌 Uni Status\n'));
    console.log(`  Universes: ${chalk.cyan(String(unis.length))}`);
    console.log(`  Agents:    ${chalk.cyan(String(totalAgents))}`);
    if (types.size > 0) {
      console.log(`  Types:     ${[...types.entries()].map(([t, c]) => `${t}(${c})`).join(', ')}`);
    }
    console.log('');
  });

program
  .command('cleanup <id>')
  .description('Remove a universe and all its workspaces/agent directories')
  .option('--dir <path>', 'OpenClaw base directory')
  .action((id: string, opts: { dir?: string }) => {
    const uni = getUni(id, opts.dir);
    if (!uni) {
      console.error(chalk.red(`Universe "${id}" not found.`));
      process.exit(1);
    }

    console.log(chalk.yellow(`Cleaning up "${id}" (${uni.agentIds.length} agents)...`));
    const result = cleanupUni(id, opts.dir);

    console.log(chalk.green(`\n✓ Cleanup complete:`));
    console.log(chalk.gray(`  Removed ${result.removedWorkspaces.length} workspaces`));
    console.log(chalk.gray(`  Removed ${result.removedAgentDirs.length} agent directories`));
    console.log(chalk.gray(`  Removed ${result.removedFromConfig.length} agents from openclaw.json`));
  });

program
  .command('reset <id>')
  .description('Reset a universe: clear sessions and runtime files, keep SOUL.md')
  .option('--dir <path>', 'OpenClaw base directory')
  .action((id: string, opts: { dir?: string }) => {
    const uni = getUni(id, opts.dir);
    if (!uni) {
      console.error(chalk.red(`Universe "${id}" not found.`));
      process.exit(1);
    }

    console.log(chalk.yellow(`Resetting "${id}"...`));
    const result = resetUni(id, opts.dir);

    console.log(chalk.green(`\n✓ Reset complete:`));
    console.log(chalk.gray(`  Cleared sessions for ${result.clearedSessions.length} agents`));
    console.log(chalk.gray(`  Cleared ${result.clearedTasks.length} runtime files`));
  });

program.parse();
