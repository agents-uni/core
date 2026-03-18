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

interface AgentInfo {
  id: string;
  name: string;
  role?: string;
  rank?: number;
  department?: string;
  traits?: Record<string, number>;
}

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

        const seeds = generateRelationshipSeeds(agents, config.type);

        // Only add relationships that don't already exist
        const existingPairs = new Set(
          config.relationships.map(r => `${r.from}:${r.to}`)
        );

        let added = 0;
        for (const seed of seeds) {
          const key = `${seed.from}:${seed.to}`;
          if (!existingPairs.has(key)) {
            config.relationships.push({
              from: seed.from,
              to: seed.to,
              type: seed.type as 'peer',
              weight: 0.5,
            });
            existingPairs.add(key);
            added++;
            console.log(`    + ${chalk.gray(seed.from)} → ${chalk.gray(seed.to)}: ${chalk.yellow(seed.type)}`);
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

      // Suggest events based on relationship tensions
      const suggestions = suggestEvents(graph, config, eventCount);

      if (suggestions.length === 0) {
        console.log(chalk.gray('  No interesting events to suggest (graph may be too sparse)'));
      } else {
        for (let i = 0; i < suggestions.length; i++) {
          const s = suggestions[i];
          console.log(`  ${chalk.bold(`${i + 1}.`)} ${chalk.yellow(s.eventType)}`);
          console.log(`     ${s.from} → ${s.to}`);
          console.log(chalk.gray(`     ${s.reason}`));
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

// ─── Local helpers ──────────────────────────────────────

/** Generate relationship seeds using heuristic rank-based pairing */
function generateRelationshipSeeds(
  agents: AgentInfo[],
  type: string
): Array<{ from: string; to: string; type: string }> {
  const seeds: Array<{ from: string; to: string; type: string }> = [];
  const sorted = [...agents].sort((a, b) => (b.rank ?? 50) - (a.rank ?? 50));

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const rankDiff = (a.rank ?? 50) - (b.rank ?? 50);

      if (rankDiff > 20) {
        seeds.push({ from: a.id, to: b.id, type: 'superior' });
      } else if (type === 'competitive' && Math.abs(rankDiff) < 10) {
        seeds.push({ from: a.id, to: b.id, type: 'rival' });
      } else {
        seeds.push({ from: a.id, to: b.id, type: 'peer' });
      }
    }
  }

  return seeds;
}

interface EventSuggestion {
  eventType: string;
  from: string;
  to: string;
  reason: string;
}

/** Suggest events based on graph relationships */
function suggestEvents(
  graph: import('@agents-uni/rel').RelationshipGraph,
  config: import('../../types/index.js').UniverseConfig,
  count: number
): EventSuggestion[] {
  const eventTypes = [
    'conflict.escalated', 'alliance.formed', 'betrayal.discovered',
    'competition.won', 'task.completed', 'conflict.resolved',
  ];
  const suggestions: EventSuggestion[] = [];

  for (const rel of config.relationships) {
    if (suggestions.length >= count) break;
    const eventType = rel.type === 'rival'
      ? 'conflict.escalated'
      : rel.type === 'ally'
        ? 'alliance.formed'
        : eventTypes[Math.floor(Math.random() * eventTypes.length)];
    suggestions.push({
      eventType,
      from: rel.from,
      to: rel.to,
      reason: `Based on ${rel.type} relationship between ${rel.from} and ${rel.to}`,
    });
  }

  return suggestions.slice(0, count);
}
