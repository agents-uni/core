export { generateSoul, generateAllSouls, type SoulGeneratorOptions, type RulerDefinition } from './soul-generator.js';
export { deployToOpenClaw, registerAgentsInOpenClaw, type DeployOptions, type DeployResult } from './openclaw-adapter.js';
export { checkWorkspaces, readOpenClawConfig, type SyncResult } from './config-sync.js';
export {
  TaskDispatcher,
  type DispatchTask,
  type AgentSubmission,
  type DispatchResult,
  type DispatcherOptions,
  type EvaluationCriterion,
} from './task-dispatcher.js';
export {
  FileWorkspaceIO,
  MemoryWorkspaceIO,
  type WorkspaceIO,
  type FileWorkspaceIOOptions,
} from './workspace-io.js';
export {
  registerUni,
  listUnis,
  getUni,
  unregisterUni,
  cleanupUni,
  updateUni,
  resetUni,
  type UniRegistryEntry,
  type UniRegistry,
} from './uni-registry.js';

// Agency-agents bridge
export {
  parseAgencyAgentFile,
  toAgentDefinition,
  toSoulMd,
  importAgencyAgents,
  type AgencyAgentFile,
  type AgencyAgentFrontmatter,
  type ImportOptions,
  type ImportResult,
} from './agency-import.js';

// @agents-uni/rel bridge (multi-dimensional relationships)
export {
  createRelGraph,
  createRelEngine,
  generateEnhancedRelationshipSection,
  // Re-exports from @agents-uni/rel
  MultiDimRelationshipGraph,
  EvolutionEngine,
  EmergenceDetector,
  fromLegacyArray,
  generateSoulRelationshipSection,
  computeInfluence,
  analyzeStructure,
  detectClusters,
} from './rel-bridge.js';
export type {
  MultiDimRelationship,
  Dimension,
  DimensionSeed,
  RelationshipSeed,
  RelationshipTemplate,
  EvolutionRule,
  RelEvent,
  Pattern,
  RelationshipContext,
  InfluenceScore,
  StructuralAnalysis,
  EmergenceResult,
  ConsolidationResult,
  RelEngineBundle,
} from './rel-bridge.js';
// Re-export with alias to avoid name collision with core's MemoryConsolidator
export { RelMemoryConsolidator } from './rel-bridge.js';

// Agency-agents registry (repo lifecycle management)
export {
  getAgencyDir,
  isAgencyInstalled,
  agencyInit,
  agencyUpdate,
  agencyListCategories,
  agencyStatus,
  resolveAgencyCategories,
  getAvailableCategories,
  type AgencyCategory,
  type AgencyCategoryInfo,
  type AgencyStatus,
  type AgencyUpdateResult,
} from './agency-registry.js';
