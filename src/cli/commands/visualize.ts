import chalk from 'chalk';
import { parseSpecFile } from '../../spec/parser.js';

const TYPE_SYMBOLS: Record<string, string> = {
  superior: '──▶',
  subordinate: '◀──',
  peer: '◆───◆',
  competitive: '⚔',
  reviewer: '🔍▶',
  advisor: '💡▶',
  ally: '🤝',
  rival: '⚡',
  mentor: '📚▶',
  delegate: '📋▶',
};

export function visualizeCommand(file: string): void {
  try {
    const config = parseSpecFile(file);

    console.log(chalk.bold(`\n  Universe: ${config.name} (${config.type})`));
    console.log(chalk.gray(`  ${config.description}`));
    console.log('');

    // Agents section
    console.log(chalk.bold.underline('  Agents'));
    const sortedAgents = [...config.agents].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));
    for (const agent of sortedAgents) {
      const rankBar = agent.rank !== undefined
        ? chalk.yellow('█'.repeat(Math.round(agent.rank / 10)))
        : '';
      console.log(`    ${chalk.cyan(agent.id.padEnd(20))} ${chalk.white(agent.name)} (${agent.role.title}) ${rankBar}`);
    }
    console.log('');

    // Relationships section
    console.log(chalk.bold.underline('  Relationships'));
    for (const rel of config.relationships) {
      const symbol = TYPE_SYMBOLS[rel.type] ?? '──';
      const weight = rel.weight !== undefined ? chalk.gray(` [${rel.weight}]`) : '';
      console.log(`    ${chalk.cyan(rel.from)} ${symbol} ${chalk.cyan(rel.to)} ${chalk.gray(rel.type)}${weight}`);
    }
    console.log('');

    // Protocols section
    console.log(chalk.bold.underline('  Protocols'));
    for (const proto of config.protocols) {
      console.log(`    ${chalk.magenta(proto.name)}: ${proto.description}`);
      const stateFlow = proto.states
        .map(s => s.terminal ? chalk.red(s.label) : chalk.green(s.label))
        .join(' → ');
      console.log(`      ${stateFlow}`);
    }
    console.log('');

    // Resources section
    if (config.resources && config.resources.length > 0) {
      console.log(chalk.bold.underline('  Resources'));
      for (const res of config.resources) {
        console.log(`    ${chalk.yellow(res.name)}: ${res.type} (total: ${res.total}, dist: ${res.distribution})`);
      }
      console.log('');
    }

    // Governance summary
    console.log(chalk.bold.underline('  Governance'));
    console.log(`    Model: ${config.governance.decisionModel}`);
    console.log(`    Review: ${config.governance.reviewPolicy.mandatory ? 'mandatory' : 'optional'}`);
    console.log(`    Permissions: ${config.governance.permissionMatrix.length} entries`);
    console.log('');

  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}
