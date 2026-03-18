/**
 * `uni generate` — generate a universe from a natural language description.
 *
 * Usage:
 *   uni generate "甄嬛传后宫，7个嫔妃" --type competitive -o universe.yaml
 *   uni generate "software team with architect and 3 devs" --type flat
 */

import chalk from 'chalk';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';

/** Agent info used for universe generation */
interface AgentInfo {
  id: string;
  name: string;
  role?: string;
  rank?: number;
  department?: string;
  traits?: Record<string, number>;
}

export async function generateCommand(
  description: string,
  opts: {
    type?: string;
    output?: string;
    agents?: string;
    lang?: string;
  }
): Promise<void> {
  try {
    console.log(chalk.blue(`\n  Generating universe from: "${description}"\n`));

    const universeType = (opts.type ?? 'competitive') as 'competitive' | 'hierarchical' | 'flat' | 'hybrid';
    const lang = (opts.lang ?? 'zh') as 'zh' | 'en';

    // Parse agent count from description (heuristic)
    const agents = parseAgentsFromDescription(description, lang);

    console.log(chalk.gray(`  Detected ${agents.length} agents from description`));
    console.log(chalk.gray(`  Universe type: ${universeType}\n`));

    // Generate relationships using heuristic pairing
    const seeds = generateRelationshipSeeds(agents, universeType);

    // Build universe config
    const config = {
      name: slugify(description.slice(0, 30)),
      version: '0.1.0',
      description,
      type: universeType,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: {
          title: a.role ?? 'Member',
          department: a.department,
          duties: [`Fulfill ${a.role ?? 'member'} responsibilities`],
          permissions: ['participate'],
        },
        rank: a.rank,
        traits: a.traits,
      })),
      relationships: seeds.map((s: { from: string; to: string; type: string }) => ({
        from: s.from,
        to: s.to,
        type: s.type,
        weight: 0.5,
      })),
      protocols: [],
      governance: {
        decisionModel: universeType === 'hierarchical' ? 'autocratic' : 'consensus',
        permissionMatrix: [],
        reviewPolicy: { mandatory: false, reviewers: [], maxRounds: 1 },
        escalationRules: [],
      },
    };

    // Print agents
    for (const agent of agents) {
      console.log(`    ${chalk.cyan(agent.id.padEnd(20))} ${agent.name.padEnd(15)} rank:${agent.rank ?? 50}`);
    }

    // Print relationships
    console.log(chalk.bold(`\n  Generated ${seeds.length} relationships:\n`));
    for (const seed of seeds) {
      console.log(`    ${chalk.gray(seed.from)} → ${chalk.gray(seed.to)}: ${chalk.yellow(seed.type)}`);
    }

    // Write output
    const outputPath = resolve(opts.output ?? 'universe.yaml');
    const yamlContent = stringify(config, { lineWidth: 120 });
    writeFileSync(outputPath, yamlContent, 'utf-8');
    console.log(chalk.green(`\n  ✓ Written to ${outputPath}\n`));
  } catch (err) {
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exit(1);
  }
}

// ─── Helpers ──────────────────────────────────────────

/** Extract agents from a natural language description */
function parseAgentsFromDescription(description: string, lang: 'zh' | 'en'): AgentInfo[] {
  // Try to find a number of agents
  const numMatch = description.match(/(\d+)\s*(?:个|位|名|agents?|devs?|members?|嫔妃|人)/i);
  const count = numMatch ? parseInt(numMatch[1], 10) : 4;

  // Detect named agents
  const agents: AgentInfo[] = [];

  // Check for known character sets (甄嬛传)
  if (description.includes('甄嬛') || description.includes('后宫')) {
    return getZhenhuan(count);
  }

  // Check for software team
  if (/software|dev|engineer|architect/i.test(description)) {
    return getSoftwareTeam(count);
  }

  // Generic agents
  for (let i = 0; i < count; i++) {
    const rank = Math.round(30 + Math.random() * 40);
    agents.push({
      id: `agent-${i + 1}`,
      name: lang === 'zh' ? `成员${i + 1}` : `Agent ${i + 1}`,
      role: 'Member',
      rank,
    });
  }

  return agents;
}

function getZhenhuan(count: number): AgentInfo[] {
  const pool: AgentInfo[] = [
    { id: 'zhenhuan', name: '甄嬛', role: '嫔妃', rank: 75, department: '后宫', traits: { intelligence: 0.95, empathy: 0.7, ambition: 0.8 } },
    { id: 'huanbi', name: '皇后', role: '皇后', rank: 95, department: '后宫', traits: { deception: 0.8, ambition: 0.9, intelligence: 0.8 } },
    { id: 'anlingrong', name: '安陵容', role: '嫔妃', rank: 55, department: '后宫', traits: { deception: 0.9, ambition: 0.7, empathy: 0.2 } },
    { id: 'shenmeizhuang', name: '沈眉庄', role: '嫔妃', rank: 65, department: '后宫', traits: { loyalty: 0.9, intelligence: 0.7, empathy: 0.8 } },
    { id: 'huafei', name: '华妃', role: '妃嫔', rank: 85, department: '后宫', traits: { ambition: 0.95, charisma: 0.7, intelligence: 0.6 } },
    { id: 'qibin', name: '祺嫔', role: '嫔妃', rank: 50, department: '后宫', traits: { deception: 0.6, ambition: 0.5 } },
    { id: 'duanfei', name: '端妃', role: '妃嫔', rank: 70, department: '后宫', traits: { intelligence: 0.8, empathy: 0.6 } },
    { id: 'jingfei', name: '敬妃', role: '妃嫔', rank: 68, department: '后宫', traits: { loyalty: 0.7, empathy: 0.7 } },
    { id: 'niugulv', name: '宁贵人', role: '贵人', rank: 45, department: '后宫', traits: { ambition: 0.4, empathy: 0.5 } },
  ];

  return pool.slice(0, Math.min(count, pool.length));
}

function getSoftwareTeam(count: number): AgentInfo[] {
  const pool: AgentInfo[] = [
    { id: 'architect', name: 'Architect', role: 'Software Architect', rank: 80, department: 'engineering', traits: { analytical: 0.9, intelligence: 0.85 } },
    { id: 'tech-lead', name: 'Tech Lead', role: 'Tech Lead', rank: 70, department: 'engineering', traits: { analytical: 0.8, charisma: 0.6 } },
    { id: 'senior-dev-1', name: 'Senior Dev 1', role: 'Senior Developer', rank: 60, department: 'engineering', traits: { analytical: 0.7, creativity: 0.7 } },
    { id: 'senior-dev-2', name: 'Senior Dev 2', role: 'Senior Developer', rank: 60, department: 'engineering', traits: { analytical: 0.75, empathy: 0.6 } },
    { id: 'dev-1', name: 'Developer 1', role: 'Developer', rank: 45, department: 'engineering', traits: { creativity: 0.8, ambition: 0.6 } },
    { id: 'dev-2', name: 'Developer 2', role: 'Developer', rank: 45, department: 'engineering', traits: { analytical: 0.6, ambition: 0.5 } },
    { id: 'dev-3', name: 'Developer 3', role: 'Developer', rank: 45, department: 'engineering', traits: { empathy: 0.7, creativity: 0.6 } },
    { id: 'qa', name: 'QA Engineer', role: 'QA', rank: 50, department: 'engineering', traits: { analytical: 0.85, intelligence: 0.7 } },
  ];

  return pool.slice(0, Math.min(count, pool.length));
}

function slugify(text: string): string {
  return text
    .replace(/[\u4e00-\u9fff]/g, '') // Remove CJK chars for slug
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 30)
    .replace(/-+$/, '')
    || 'generated-universe';
}

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
