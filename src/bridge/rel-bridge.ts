/**
 * @agents-uni/rel Bridge — integrates the multi-dimensional relationship
 * engine into agents-uni-core's existing pipeline.
 *
 * This bridge provides:
 * 1. Conversion from core's RelationshipDefinition[] → rel's RelationshipGraph
 * 2. Evolution engine wrapper that connects to core's EventBus
 * 3. Enhanced SOUL.md generation with multi-dimensional relationship sections
 * 4. Memory consolidation integrated into the core lifecycle
 *
 * Backward compatible: existing code using the old RelationshipGraph still works.
 */

import {
  RelationshipGraph as RelGraph,
  EvolutionEngine,
  MemoryConsolidator,
  EmergenceDetector,
  fromLegacyArray,
  generateSoulRelationshipSection,
  computeInfluence,
  analyzeStructure,
  detectClusters,
} from '@agents-uni/rel';

import type {
  RelationshipContext,
  RelationshipSeed,
  ConsolidationResult,
  InfluenceScore,
  StructuralAnalysis,
  EmergenceResult,
} from '@agents-uni/rel';

import type { RelationshipDefinition, UniverseConfig, AgentDefinition } from '../types/index.js';

// Re-export for downstream consumers
export {
  RelationshipGraph as MultiDimRelationshipGraph,
  EvolutionEngine,
  MemoryConsolidator as RelMemoryConsolidator,
  EmergenceDetector,
  fromLegacyArray,
  generateSoulRelationshipSection,
  computeInfluence,
  analyzeStructure,
  detectClusters,
} from '@agents-uni/rel';

export type {
  Relationship as MultiDimRelationship,
  Dimension,
  DimensionSeed,
  RelationshipSeed,
  RelationshipTemplate,
  EvolutionRule,
  RelationshipEvent as RelEvent,
  Pattern,
  RelationshipContext,
  InfluenceScore,
  StructuralAnalysis,
  EmergenceResult,
  ConsolidationResult,
} from '@agents-uni/rel';

// ═══════════════════════════════════════════════════════
//  Core → Rel conversion
// ═══════════════════════════════════════════════════════

/**
 * Convert core RelationshipDefinition[] to @agents-uni/rel seeds
 * and create a multi-dimensional relationship graph.
 */
export function createRelGraph(
  relationships: RelationshipDefinition[]
): RelGraph {
  const seeds = fromLegacyArray(
    relationships.map(r => ({
      from: r.from,
      to: r.to,
      type: r.type,
      weight: r.weight,
      tags: r.metadata?.tags as string[] | undefined,
      metadata: r.metadata,
    }))
  );

  return new RelGraph(seeds);
}

/**
 * Create a full relationship engine from a UniverseConfig.
 * Returns graph + evolution engine + memory consolidator + emergence detector.
 */
export interface RelEngineBundle {
  graph: RelGraph;
  evolution: EvolutionEngine;
  consolidator: MemoryConsolidator;
  emergence: EmergenceDetector;
}

export function createRelEngine(config: UniverseConfig): RelEngineBundle {
  const graph = createRelGraph(config.relationships);
  const evolution = new EvolutionEngine(graph);
  const consolidator = new MemoryConsolidator();
  const emergence = new EmergenceDetector(graph);

  return { graph, evolution, consolidator, emergence };
}

// ═══════════════════════════════════════════════════════
//  Enhanced SOUL.md relationship section
// ═══════════════════════════════════════════════════════

/**
 * Generate an enhanced multi-dimensional relationship section for SOUL.md.
 * Uses @agents-uni/rel to provide richer relationship context than
 * the original simple "→ name: type" format.
 */
export function generateEnhancedRelationshipSection(
  agent: AgentDefinition,
  universe: UniverseConfig,
  relGraph: RelGraph,
  language: 'zh' | 'en' = 'zh'
): string {
  const outgoing = relGraph.getOutgoing(agent.id);
  const incoming = relGraph.getIncoming(agent.id);
  const allRels = [...outgoing, ...incoming];

  if (allRels.length === 0) return '';

  const context: RelationshipContext = {
    agentId: agent.id,
    relationships: allRels.map(rel => {
      const otherId = rel.from === agent.id ? rel.to : rel.from;
      const otherAgent = universe.agents.find(a => a.id === otherId);

      // Get top dimensions
      const topDims = [...rel.dimensions]
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 4)
        .map(d => ({ type: d.type, value: d.value }));

      return {
        otherAgentId: otherId,
        otherAgentName: otherAgent?.name,
        summary: rel.memory.longTerm.summary || generateQuickSummary(rel, otherId, language),
        dimensions: topDims,
        valence: rel.memory.valence,
        recentInteractions: rel.memory.longTerm.interactionCount,
      };
    }),
    generatedAt: new Date().toISOString(),
  };

  return generateSoulRelationshipSection(context, language);
}

/**
 * Generate a quick summary when long-term memory summary is empty.
 */
function generateQuickSummary(
  rel: { dimensions: Array<{ type: string; value: number }>; tags?: string[] },
  otherId: string,
  language: 'zh' | 'en'
): string {
  const primaryDim = [...rel.dimensions]
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))[0];

  if (!primaryDim) {
    return language === 'zh' ? `与 ${otherId} 有连接` : `Connected with ${otherId}`;
  }

  const tag = rel.tags?.[0];
  const dimLabel = primaryDim.type;
  const strength = Math.abs(primaryDim.value);
  const direction = primaryDim.value >= 0 ? (language === 'zh' ? '正面' : 'positive') : (language === 'zh' ? '负面' : 'negative');

  if (tag) {
    return language === 'zh'
      ? `${tag} 关系 — ${dimLabel} ${direction} (${strength.toFixed(2)})`
      : `${tag} relationship — ${dimLabel} ${direction} (${strength.toFixed(2)})`;
  }

  return language === 'zh'
    ? `${dimLabel} ${direction} (${strength.toFixed(2)})`
    : `${dimLabel} ${direction} (${strength.toFixed(2)})`;
}
