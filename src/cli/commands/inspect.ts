import chalk from 'chalk';
import { parseSpecFile } from '../../spec/parser.js';

export function inspectCommand(file: string, opts: { agent?: string }): void {
  try {
    const config = parseSpecFile(file);

    if (opts.agent) {
      // Inspect specific agent
      const agent = config.agents.find(a => a.id === opts.agent);
      if (!agent) {
        console.error(chalk.red(`Agent "${opts.agent}" not found`));
        console.log(chalk.gray('Available agents: ' + config.agents.map(a => a.id).join(', ')));
        process.exit(1);
      }

      console.log(chalk.bold(`\n  Agent: ${agent.name} (${agent.id})`));
      console.log(chalk.gray(`  Role: ${agent.role.title}`));
      if (agent.role.department) console.log(chalk.gray(`  Department: ${agent.role.department}`));
      if (agent.rank !== undefined) console.log(chalk.gray(`  Rank: ${agent.rank}`));

      console.log(chalk.underline('\n  Duties:'));
      for (const duty of agent.role.duties) {
        console.log(`    - ${duty}`);
      }

      console.log(chalk.underline('\n  Permissions:'));
      for (const perm of agent.role.permissions) {
        console.log(`    - ${chalk.green(perm)}`);
      }

      if (agent.traits) {
        console.log(chalk.underline('\n  Traits:'));
        for (const [trait, value] of Object.entries(agent.traits)) {
          const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
          console.log(`    ${trait}: ${bar} ${(value * 100).toFixed(0)}%`);
        }
      }

      // Show relationships
      const rels = config.relationships.filter(r => r.from === agent.id || r.to === agent.id);
      if (rels.length > 0) {
        console.log(chalk.underline('\n  Relationships:'));
        for (const rel of rels) {
          const direction = rel.from === agent.id ? '→' : '←';
          const other = rel.from === agent.id ? rel.to : rel.from;
          console.log(`    ${direction} ${chalk.cyan(other)}: ${rel.type}`);
        }
      }

      // Show permission matrix entries
      const perms = config.governance.permissionMatrix.filter(
        p => p.actor === agent.id || p.target === agent.id
      );
      if (perms.length > 0) {
        console.log(chalk.underline('\n  Permission Matrix:'));
        for (const perm of perms) {
          const direction = perm.actor === agent.id ? 'can' : 'receives';
          const other = perm.actor === agent.id ? perm.target : perm.actor;
          console.log(`    ${direction} ${perm.actions.join(', ')} ${perm.actor === agent.id ? '→' : '←'} ${chalk.cyan(other)}`);
        }
      }
    } else {
      // Overview
      console.log(chalk.bold(`\n  Universe: ${config.name} v${config.version}`));
      console.log(chalk.gray(`  ${config.description}`));
      console.log(`  Type: ${config.type}`);
      console.log(`  Agents: ${config.agents.length}`);
      console.log(`  Relationships: ${config.relationships.length}`);
      console.log(`  Protocols: ${config.protocols.length}`);
      console.log(`  Resources: ${config.resources?.length ?? 0}`);
      console.log(`  Governance: ${config.governance.decisionModel}`);
      console.log('');
      console.log(chalk.gray('  Use --agent <id> to inspect a specific agent'));
      console.log(chalk.gray('  Agents: ' + config.agents.map(a => a.id).join(', ')));
    }
    console.log('');
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}
