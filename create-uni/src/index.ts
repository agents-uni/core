#!/usr/bin/env node

/**
 * create-uni — Scaffold a new agent universe project.
 *
 * Usage: npx create-uni [name]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generate } from './generator.js';

const program = new Command();

program
  .name('create-uni')
  .description('Create a new agent universe project')
  .argument('[name]', 'Project name', 'my-universe')
  .option('-t, --template <template>', 'Template to use (government|corporation|competitive|flat|military)', 'competitive')
  .option('--no-install', 'Skip npm install')
  .action(async (name: string, opts: { template: string; install: boolean }) => {
    console.log(chalk.bold(`\n  🌌 create-uni — Agent Universe Scaffolding Tool\n`));
    await generate(name, opts.template);
    console.log(chalk.green(`\n  ✓ Universe "${name}" created successfully!\n`));
    console.log(chalk.blue('  Next steps:'));
    console.log(chalk.white(`    cd ${name}`));
    console.log(chalk.white(`    npm install`));
    console.log(chalk.white(`    npx uni validate universe.yaml`));
    console.log(chalk.white(`    npx uni visualize universe.yaml`));
    console.log('');
  });

program.parse();
