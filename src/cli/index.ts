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

// ─── agency-agents 桥接 ──────────────────────

const agency = program
  .command('agency')
  .description('Manage agency-agents integration (init, update, list, import)');

agency
  .command('init')
  .description('Download agency-agents repository (~140 high-quality agent definitions)')
  .option('--full', 'Full clone (default: shallow clone for speed)', false)
  .action(async (opts: { full: boolean }) => {
    const {
      isAgencyInstalled,
      agencyInit,
      agencyStatus,
    } = await import('../bridge/agency-registry.js');

    if (isAgencyInstalled()) {
      const status = agencyStatus();
      console.log(chalk.yellow(`\n  agency-agents is already installed at ${status.dir}`));
      console.log(chalk.gray(`  ${status.totalAgents} agents across ${status.categories?.length} categories`));
      console.log(chalk.gray(`  Run \`uni agency update\` to pull latest changes.\n`));
      return;
    }

    console.log(chalk.yellow('\n  Downloading agency-agents repository...\n'));
    console.log(chalk.gray('  Source: https://github.com/msitarzewski/agency-agents'));
    console.log(chalk.gray('  This may take a moment...\n'));

    try {
      agencyInit(!opts.full);
      const status = agencyStatus();
      console.log(chalk.green(`  ✓ Installed to ${status.dir}`));
      console.log(chalk.green(`  ✓ ${status.totalAgents} agents across ${status.categories?.length} categories\n`));
      console.log(chalk.gray('  Next steps:'));
      console.log(chalk.gray('    uni agency list              — see available categories'));
      console.log(chalk.gray('    uni agency import engineering — import a category'));
      console.log(chalk.gray('    uni agency import --all       — import all agents\n'));
    } catch (e) {
      console.error(chalk.red(`  ✗ Failed: ${e instanceof Error ? e.message : e}\n`));
      process.exit(1);
    }
  });

agency
  .command('update')
  .description('Pull latest changes from agency-agents repository')
  .action(async () => {
    const { isAgencyInstalled, agencyUpdate } = await import('../bridge/agency-registry.js');

    if (!isAgencyInstalled()) {
      console.error(chalk.red('\n  agency-agents is not installed. Run `uni agency init` first.\n'));
      process.exit(1);
    }

    console.log(chalk.yellow('\n  Checking for updates...\n'));

    try {
      const result = agencyUpdate();
      if (result.updated) {
        console.log(chalk.green(`  ✓ Updated: ${result.oldCommit} → ${result.newCommit}`));
        if (result.changelog.length > 0) {
          console.log(chalk.gray('\n  Changelog:'));
          for (const line of result.changelog.slice(0, 10)) {
            console.log(chalk.gray(`    ${line}`));
          }
          if (result.changelog.length > 10) {
            console.log(chalk.gray(`    ... and ${result.changelog.length - 10} more`));
          }
        }
      } else {
        console.log(chalk.green(`  ✓ Already up to date (${result.newCommit})`));
      }
      console.log();
    } catch (e) {
      console.error(chalk.red(`  ✗ Update failed: ${e instanceof Error ? e.message : e}\n`));
      process.exit(1);
    }
  });

agency
  .command('list')
  .description('List available agent categories and agent counts')
  .action(async () => {
    const { isAgencyInstalled, agencyStatus } = await import('../bridge/agency-registry.js');

    if (!isAgencyInstalled()) {
      console.error(chalk.red('\n  agency-agents is not installed. Run `uni agency init` first.\n'));
      process.exit(1);
    }

    const status = agencyStatus();

    console.log(chalk.bold('\n  📦 agency-agents\n'));
    console.log(chalk.gray(`  Location: ${status.dir}`));
    console.log(chalk.gray(`  Commit:   ${status.commit}`));
    console.log(chalk.gray(`  Updated:  ${status.lastUpdated}\n`));

    console.log(chalk.gray('  Category                  Agents'));
    console.log(chalk.gray('  ' + '─'.repeat(42)));

    let total = 0;
    for (const cat of status.categories ?? []) {
      const name = cat.name.padEnd(26);
      total += cat.agentCount;
      console.log(`  ${chalk.cyan(name)} ${chalk.white(String(cat.agentCount))}`);
    }

    console.log(chalk.gray('  ' + '─'.repeat(42)));
    console.log(`  ${chalk.bold('Total'.padEnd(26))} ${chalk.bold(String(total))}`);
    console.log();
  });

agency
  .command('import <categories...>')
  .description('Import agents by category name (e.g., engineering design) or --all')
  .option('-n, --name <name>', 'Universe name', 'imported-universe')
  .option('-t, --type <type>', 'Universe type (flat|competitive|hierarchical|hybrid)', 'flat')
  .option('-r, --relationships <strategy>', 'Relationship strategy (none|peer|competitive)', 'none')
  .option('-o, --output <file>', 'Output file path', 'universe.yaml')
  .option('--deploy', 'Also deploy SOUL.md files to OpenClaw workspaces', false)
  .option('--deploy-dir <dir>', 'OpenClaw directory for deployment', '')
  .option('--lang <lang>', 'Language for generated content (zh|en)', 'en')
  .action(async (categories: string[], opts) => {
    const { resolve } = await import('node:path');
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const { stringify } = await import('yaml');
    const { importAgencyAgents, toSoulMd } = await import('../bridge/agency-import.js');
    const { resolveAgencyCategories, isAgencyInstalled } = await import('../bridge/agency-registry.js');

    if (!isAgencyInstalled()) {
      console.error(chalk.red('\n  agency-agents is not installed. Run `uni agency init` first.\n'));
      process.exit(1);
    }

    let dirs: string[];
    try {
      dirs = resolveAgencyCategories(categories);
    } catch (e) {
      console.error(chalk.red(`\n  ✗ ${e instanceof Error ? e.message : e}\n`));
      process.exit(1);
    }

    const label = categories.includes('all')
      ? 'all categories'
      : categories.join(', ');
    console.log(chalk.yellow(`\n  Importing agents from ${label}...\n`));

    const result = importAgencyAgents(dirs, {
      name: opts.name,
      type: opts.type as 'flat' | 'competitive' | 'hierarchical' | 'hybrid',
      relationships: opts.relationships as 'none' | 'peer' | 'competitive',
      language: opts.lang as 'zh' | 'en',
    });

    // Print warnings
    for (const w of result.warnings) {
      console.log(chalk.yellow(`  ⚠ ${w}`));
    }

    // Print imported agents
    console.log(chalk.green(`  ✓ Imported ${result.agents.length} agents:\n`));
    for (const agent of result.agents) {
      console.log(
        `    ${agent.frontmatter.emoji ?? '🤖'} ${chalk.bold(agent.frontmatter.name.padEnd(30))} ${chalk.gray(agent.id)}`
      );
    }

    // Write universe.yaml
    const outputPath = resolve(opts.output);
    const yamlContent = stringify(result.config, { lineWidth: 120 });
    writeFileSync(outputPath, yamlContent, 'utf-8');
    console.log(chalk.green(`\n  ✓ Written to ${outputPath}`));

    // Optional: deploy SOUL.md files
    if (opts.deploy) {
      const { join } = await import('node:path');
      const openclawDir = opts.deployDir || undefined;

      for (const agent of result.agents) {
        const soulContent = toSoulMd(agent, {
          universe: result.config,
          language: opts.lang as 'zh' | 'en',
        });

        const wsDir = join(
          openclawDir ?? `${process.env.HOME}/.openclaw`,
          `workspace-${agent.id}`
        );
        mkdirSync(wsDir, { recursive: true });
        writeFileSync(join(wsDir, 'SOUL.md'), soulContent, 'utf-8');
      }

      console.log(chalk.green(`  ✓ Deployed ${result.agents.length} SOUL.md files to OpenClaw workspaces`));
    }

    console.log();
  });

// ─── import (raw paths, for power users) ─────

program
  .command('import <dirs...>')
  .description('Import agents from raw directory paths into a universe.yaml')
  .option('-n, --name <name>', 'Universe name', 'imported-universe')
  .option('-t, --type <type>', 'Universe type (flat|competitive|hierarchical|hybrid)', 'flat')
  .option('-r, --relationships <strategy>', 'Relationship strategy (none|peer|competitive)', 'none')
  .option('-o, --output <file>', 'Output file path', 'universe.yaml')
  .option('--deploy', 'Also deploy SOUL.md files to OpenClaw workspaces', false)
  .option('--deploy-dir <dir>', 'OpenClaw directory for deployment', '')
  .option('--lang <lang>', 'Language for generated content (zh|en)', 'en')
  .action(async (dirs: string[], opts) => {
    const { resolve } = await import('node:path');
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const { stringify } = await import('yaml');
    const { importAgencyAgents, toSoulMd } = await import('../bridge/agency-import.js');

    const resolvedDirs = dirs.map((d: string) => resolve(d));

    console.log(chalk.yellow(`\n  Importing agents from ${resolvedDirs.length} director${resolvedDirs.length > 1 ? 'ies' : 'y'}...\n`));

    const result = importAgencyAgents(resolvedDirs, {
      name: opts.name,
      type: opts.type as 'flat' | 'competitive' | 'hierarchical' | 'hybrid',
      relationships: opts.relationships as 'none' | 'peer' | 'competitive',
      language: opts.lang as 'zh' | 'en',
    });

    for (const w of result.warnings) {
      console.log(chalk.yellow(`  ⚠ ${w}`));
    }

    console.log(chalk.green(`  ✓ Imported ${result.agents.length} agents:\n`));
    for (const agent of result.agents) {
      console.log(
        `    ${agent.frontmatter.emoji ?? '🤖'} ${chalk.bold(agent.frontmatter.name.padEnd(30))} ${chalk.gray(agent.id)}`
      );
    }

    const outputPath = resolve(opts.output);
    const yamlContent = stringify(result.config, { lineWidth: 120 });
    writeFileSync(outputPath, yamlContent, 'utf-8');
    console.log(chalk.green(`\n  ✓ Written to ${outputPath}`));

    if (opts.deploy) {
      const { join } = await import('node:path');
      const openclawDir = opts.deployDir || undefined;

      for (const agent of result.agents) {
        const soulContent = toSoulMd(agent, {
          universe: result.config,
          language: opts.lang as 'zh' | 'en',
        });

        const wsDir = join(
          openclawDir ?? `${process.env.HOME}/.openclaw`,
          `workspace-${agent.id}`
        );
        mkdirSync(wsDir, { recursive: true });
        writeFileSync(join(wsDir, 'SOUL.md'), soulContent, 'utf-8');
      }

      console.log(chalk.green(`  ✓ Deployed ${result.agents.length} SOUL.md files to OpenClaw workspaces`));
    }

    console.log();
  });

program.parse();
