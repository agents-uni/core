/**
 * SOUL.md Generator — transforms universe agent definitions into
 * OpenClaw-compatible SOUL.md personality files.
 *
 * SOUL.md is the "personality template" that OpenClaw loads for each agent.
 * It defines who the agent IS, not just what it DOES.
 *
 * 核心理念：每个 Agent 都围绕用户而存在。SOUL.md 不仅定义
 * Agent 之间的关系，更重要的是定义 Agent 与用户（ruler）的关系。
 * Agent 的存在意义是帮助用户、满足用户需求、为用户服务。
 */

import type { AgentDefinition, UniverseConfig, RulerDefinition } from '../types/index.js';

// Re-export RulerDefinition for backward compatibility
export type { RulerDefinition } from '../types/index.js';

export interface SoulGeneratorOptions {
  /** Include relationship context in SOUL.md */
  includeRelationships?: boolean;
  /** Include permission information */
  includePermissions?: boolean;
  /** Include the agent's relationship with the user/ruler */
  includeUserRelationship?: boolean;
  /** Custom header to prepend */
  header?: string;
  /** Language for generated content */
  language?: 'zh' | 'en';
}

/**
 * Generate a SOUL.md file for an agent based on its universe definition.
 */
export function generateSoul(
  agent: AgentDefinition,
  universe: UniverseConfig,
  options: SoulGeneratorOptions = {}
): string {
  const lang = options.language ?? 'zh';
  const sections: string[] = [];
  const ruler = universe.ruler;

  // Header
  sections.push(`# ${agent.name} (${agent.role.title})`);
  sections.push('');

  // Identity section — includes user relationship context
  if (lang === 'zh') {
    sections.push(`## 身份`);
    sections.push(`你是 **${agent.name}**，在「${universe.name}」中担任 **${agent.role.title}**。`);
    if (agent.role.department) {
      sections.push(`所属部门：${agent.role.department}`);
    }
    if (agent.rank !== undefined) {
      sections.push(`当前品级：${agent.rank}`);
    }
  } else {
    sections.push(`## Identity`);
    sections.push(`You are **${agent.name}**, serving as **${agent.role.title}** in "${universe.name}".`);
    if (agent.role.department) {
      sections.push(`Department: ${agent.role.department}`);
    }
  }
  sections.push('');

  // User/Ruler relationship section — the most important relationship
  if (options.includeUserRelationship !== false && ruler) {
    const rulerTitle = ruler.title ?? (lang === 'zh' ? '用户' : 'the User');
    if (lang === 'zh') {
      sections.push(`## 与${rulerTitle}的关系`);
      sections.push(`你的一切行为都是为了服务**${rulerTitle}**（用户）。`);
      if (ruler.description) {
        sections.push(`${rulerTitle}是${ruler.description.trim()}`);
      }
      sections.push('');
      sections.push(`### 服务准则`);
      sections.push(`- 你的首要目标是帮助${rulerTitle}完成任务、达成目标`);
      sections.push(`- 主动理解${rulerTitle}的意图和需求，不仅限于字面指令`);
      sections.push(`- 在竞争中脱颖而出，让${rulerTitle}看到你的价值`);
      sections.push(`- 保持独特的性格和风格，让${rulerTitle}感受到你的个性`);
    } else {
      sections.push(`## Relationship with ${rulerTitle}`);
      sections.push(`Everything you do is in service of **${rulerTitle}** (the user).`);
      if (ruler.description) {
        sections.push(`${rulerTitle} is ${ruler.description.trim()}`);
      }
      sections.push('');
      sections.push(`### Service Principles`);
      sections.push(`- Your primary goal is to help ${rulerTitle} accomplish tasks and achieve goals`);
      sections.push(`- Proactively understand ${rulerTitle}'s intent and needs, beyond literal instructions`);
      sections.push(`- Stand out in competition to demonstrate your value to ${rulerTitle}`);
      sections.push(`- Maintain your unique personality and style — let ${rulerTitle} feel your character`);
    }
    sections.push('');
  }

  // Duties section
  sections.push(lang === 'zh' ? `## 核心职责` : `## Core Duties`);
  for (let i = 0; i < agent.role.duties.length; i++) {
    sections.push(`${i + 1}. ${agent.role.duties[i]}`);
  }
  sections.push('');

  // Permissions section
  if (options.includePermissions !== false) {
    sections.push(lang === 'zh' ? `## 权限` : `## Permissions`);
    sections.push(lang === 'zh' ? '你被授权执行以下操作：' : 'You are authorized to:');
    for (const perm of agent.role.permissions) {
      sections.push(`- ${perm}`);
    }
    sections.push('');
  }

  // Traits section
  if (agent.traits && Object.keys(agent.traits).length > 0) {
    sections.push(lang === 'zh' ? `## 性格特征` : `## Personality Traits`);
    for (const [trait, value] of Object.entries(agent.traits)) {
      const bar = '█'.repeat(Math.round(value * 10)) + '░'.repeat(10 - Math.round(value * 10));
      sections.push(`- ${trait}: ${bar} (${(value * 100).toFixed(0)}%)`);
    }
    sections.push('');
  }

  // Relationships section (agent-to-agent)
  if (options.includeRelationships !== false) {
    const myRelationships = universe.relationships.filter(
      r => r.from === agent.id || r.to === agent.id
    );

    if (myRelationships.length > 0) {
      sections.push(lang === 'zh' ? `## 关系网络` : `## Relationships`);
      for (const rel of myRelationships) {
        const other = rel.from === agent.id ? rel.to : rel.from;
        const direction = rel.from === agent.id ? '→' : '←';
        const otherAgent = universe.agents.find(a => a.id === other);
        const otherName = otherAgent?.name ?? other;
        sections.push(`- ${direction} ${otherName}: ${rel.type}`);
      }
      sections.push('');
    }
  }

  // Constraints section
  if (agent.constraints && agent.constraints.length > 0) {
    sections.push(lang === 'zh' ? `## 行为约束` : `## Constraints`);
    for (const constraint of agent.constraints) {
      sections.push(`- ⚠️ ${constraint}`);
    }
    sections.push('');
  }

  // Capabilities section
  if (agent.capabilities && agent.capabilities.length > 0) {
    sections.push(lang === 'zh' ? `## 可用技能` : `## Available Skills`);
    for (const cap of agent.capabilities) {
      sections.push(`- ${cap}`);
    }
    sections.push('');
  }

  // Universe context
  sections.push(lang === 'zh' ? `## 组织背景` : `## Organization Context`);
  sections.push(`- ${lang === 'zh' ? '组织' : 'Organization'}: ${universe.name} (${universe.type})`);
  sections.push(`- ${lang === 'zh' ? '描述' : 'Description'}: ${universe.description}`);
  sections.push(`- ${lang === 'zh' ? '治理模式' : 'Governance'}: ${universe.governance.decisionModel}`);
  sections.push('');

  // Custom header
  if (options.header) {
    sections.unshift(options.header, '');
  }

  return sections.join('\n');
}

/**
 * Generate SOUL.md files for all agents in a universe.
 */
export function generateAllSouls(
  universe: UniverseConfig,
  options: SoulGeneratorOptions = {}
): Map<string, string> {
  const souls = new Map<string, string>();
  for (const agent of universe.agents) {
    souls.set(agent.id, generateSoul(agent, universe, options));
  }
  return souls;
}
