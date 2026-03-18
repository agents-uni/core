/**
 * `uni enrich` — enrich an existing universe spec with relationships and event suggestions.
 *
 * Usage:
 *   uni enrich universe.yaml --relationships          # auto-fill missing relationships
 *   uni enrich universe.yaml --events 6               # suggest 6 dramatic events
 *   uni enrich universe.yaml --relationships --events 6
 */

import chalk from 'chalk';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { parseSpecFile } from '../../spec/parser.js';
import { createRelEngine } from '../../bridge/rel-bridge.js';
import {
  RelationshipGenerator,
  ScenarioSuggester,
} from '@agents-uni/rel';
import type { AgentInfo } from '@agents-uni/rel';

export async function enrichCommand(
  file: string,
  opts: {
    relationships?: boolean;
    events?: string;
    output?: string;
  }
): Promise<void> {
  try {
    const config = parseSpecFile(file);
    console.log(chalk.blue(`\n  Enriching ${config.name} (${config.agents.length} agents)\n`));

    const doRelationships = opts.relationships ?? false;
    const eventCount = opts.events ? parseInt(opts.events, 10) : 0;

    if (!doRelationships && eventCount === 0) {
      console.log(chalk.yellow('  Specify --relationships and/or --events <count>'));
      return;
    }

    // Enrich relationships
    if (doRelationships) {
      const agents: AgentInfo[] = config.agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role.title,
        rank: a.rank,
        department: a.role.department,
        traits: a.traits,
      }));

      // Find agents that have no relationships
      const connected = new Set<string>();
      for (const rel of config.relationships) {
        connected.add(rel.from);
        connected.add(rel.to);
      }
      const unconnected = agents.filter(a => !connected.has(a.id));

      if (unconnected.length > 0) {
        console.log(chalk.yellow(`  Found ${unconnected.length} unconnected agents — generating relationships...\n`));

        const generator = new RelationshipGenerator();
        const result = await generator.generate(
          config.description,
          agents,
          { type: config.type as 'competitive' | 'hierarchical' | 'flat' | 'hybrid' }
        );

        // Only add relationships that don't already exist
        const existingPairs = new Set(
          config.relationships.map(r => `${r.from}:${r.to}`)
        );

        let added = 0;
        for (const seed of result.seeds) {
          const key = `${seed.from}:${seed.to}`;
          if (!existingPairs.has(key)) {
            config.relationships.push({
              from: seed.from,
              to: seed.to,
              type: (seed.type ?? 'peer') as 'peer',
              weight: 0.5,
            });
            existingPairs.add(key);
            added++;
            console.log(`    + ${chalk.gray(seed.from)} → ${chalk.gray(seed.to)}: ${chalk.yellow(seed.type ?? 'peer')}`);
          }
        }

        console.log(chalk.green(`\n  ✓ Added ${added} new relationships`));
      } else {
        console.log(chalk.green('  ✓ All agents are connected'));
      }
    }

    // Suggest events
    if (eventCount > 0) {
      console.log(chalk.bold(`\n  Suggesting ${eventCount} events...\n`));

      const { graph } = createRelEngine(config);
      const suggester = new ScenarioSuggester(graph);
      const suggestions = suggester.suggest(eventCount);

      if (suggestions.length === 0) {
        console.log(chalk.gray('  No interesting events to suggest (graph may be too sparse)'));
      } else {
        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i];
          const drama = (s.dramaPotential * 100).toFixed(0);
          console.log(`  ${chalk.bold(`${i + 1}.`)} ${chalk.yellow(s.eventType)}`);
          console.log(`     ${s.from} → ${s.to}  (drama: ${chalk.red(drama + '%')})`);
          console.log(chalk.gray(`     ${s.reason}`));
          if (s.wouldTriggerMigration) {
            console.log(chalk.magenta(`     ⚡ Would trigger: ${s.wouldTriggerMigration.fromTemplate} → ${s.wouldTriggerMigration.toTemplate}`));
          }
          console.log('');
        }
      }
    }

    // Write updated config
    const outputPath = resolve(opts.output ?? file);
    if (doRelationships) {
      const yamlContent = stringify(config as unknown as Record<string, unknown>, { lineWidth: 120 });
      writeFileSync(outputPath, yamlContent, 'utf-8');
      console.log(chalk.green(`  ✓ Written to ${outputPath}\n`));
    }
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}
