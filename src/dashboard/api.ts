/**
 * Dashboard API + Page Routes
 *
 * JSON API endpoints for programmatic access,
 * HTML page routes for browser-based dashboard.
 */

import { Hono } from 'hono';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  listUnis,
  getUni,
  cleanupUni,
  resetUni,
} from '../bridge/uni-registry.js';
import { readOpenClawConfig } from '../bridge/config-sync.js';
import { parseSpecFile } from '../spec/parser.js';
import { createRelGraph } from '../bridge/rel-bridge.js';
import { generateReport } from '@agents-uni/rel';
import {
  renderHomePage,
  renderUniDetailPage,
  renderAgentDetailPage,
  renderManagePage,
  renderGuidePage,
  renderRelationshipGraphPage,
  type HomeStats,
} from './templates.js';
import type { DashboardConfig, DashboardExtension } from './server.js';

export function createDashboardRoutes(config: DashboardConfig): Hono {
  const app = new Hono();
  const openclawDir = config.openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );

  // ─── JSON API ─────────────────────────────────

  /** List all unis */
  app.get('/api/unis', (c) => {
    const unis = listUnis(openclawDir);
    return c.json(unis);
  });

  /** Get uni detail */
  app.get('/api/unis/:id', (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: 'Uni not found' }, 404);

    const config = loadUniverseConfig(uni.specPath);
    return c.json({
      entry: uni,
      config: config ? {
        name: config.name,
        type: config.type,
        agents: config.agents.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role.title,
          rank: a.rank,
        })),
        relationships: config.relationships,
      } : null,
    });
  });

  /** Get agent detail */
  app.get('/api/unis/:id/agents/:agentId', (c) => {
    const id = c.req.param('id');
    const agentId = c.req.param('agentId');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: 'Uni not found' }, 404);

    const uniConfig = loadUniverseConfig(uni.specPath);
    const agent = uniConfig?.agents.find(a => a.id === agentId);
    if (!agent) return c.json({ error: 'Agent not found' }, 404);

    const relationships = uniConfig?.relationships.filter(
      r => r.from === agentId || r.to === agentId
    ) ?? [];

    return c.json({
      agent,
      relationships,
      workspace: getWorkspaceStatus(openclawDir, agentId),
    });
  });

  /** Get relationships for a uni (enhanced with visualization data) */
  app.get('/api/unis/:id/relationships', (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: 'Uni not found' }, 404);

    const uniConfig = loadUniverseConfig(uni.specPath);
    if (!uniConfig) return c.json({ error: 'Cannot load spec' }, 500);

    const relGraph = createRelGraph(uniConfig.relationships);
    const agentMetadata: Record<string, { name?: string; role?: string; department?: string }> = {};
    for (const agent of uniConfig.agents) {
      agentMetadata[agent.id] = {
        name: agent.name,
        role: agent.role.title,
        department: agent.role.department,
      };
    }

    const vizData = relGraph.toVisualizationData({ agentMetadata });
    return c.json(vizData);
  });

  /** Get relationship report for a uni */
  app.get('/api/unis/:id/relationships/report', (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: 'Uni not found' }, 404);

    const uniConfig = loadUniverseConfig(uni.specPath);
    if (!uniConfig) return c.json({ error: 'Cannot load spec' }, 500);

    const relGraph = createRelGraph(uniConfig.relationships);
    const report = generateReport(relGraph);
    return c.json(report);
  });

  /** Update relationships (write back to universe.yaml) */
  app.put('/api/unis/:id/relationships', async (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: 'Uni not found' }, 404);

    if (!existsSync(uni.specPath)) {
      return c.json({ error: 'Spec file not found' }, 500);
    }

    try {
      const body = await c.req.json<{
        relationships: Array<{ from: string; to: string; type: string; weight?: number }>;
      }>();

      const raw = parseYaml(readFileSync(uni.specPath, 'utf-8'));
      raw.relationships = body.relationships;
      writeFileSync(uni.specPath, stringifyYaml(raw, { lineWidth: 120 }), 'utf-8');

      return c.json({ ok: true, count: body.relationships.length });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Failed to update' }, 500);
    }
  });

  /** Reset uni */
  app.post('/api/unis/:id/reset', (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: `Uni "${id}" not found` }, 404);
    try {
      const result = resetUni(id, openclawDir);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Reset failed' }, 500);
    }
  });

  /** Cleanup (delete) uni */
  app.post('/api/unis/:id/cleanup', (c) => {
    const id = c.req.param('id');
    const uni = getUni(id, openclawDir);
    if (!uni) return c.json({ error: `Uni "${id}" not found` }, 404);
    try {
      const result = cleanupUni(id, openclawDir);
      return c.json({ ok: true, ...result });
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : 'Cleanup failed' }, 500);
    }
  });

  /** Health check */
  app.get('/api/health', (c) => {
    const configExists = existsSync(join(openclawDir, 'openclaw.json'));
    const registryExists = existsSync(join(openclawDir, 'uni-registry.json'));
    const openclawConfig = readOpenClawConfig(openclawDir);
    const agentsList = (openclawConfig?.agents as Record<string, unknown>)?.list;
    const totalAgentsInConfig = Array.isArray(agentsList) ? agentsList.length : 0;

    return c.json({
      status: 'ok',
      openclawDir,
      configExists,
      registryExists,
      totalAgentsInConfig,
      unis: listUnis(openclawDir).length,
    });
  });

  // ─── HTML Pages ───────────────────────────────

  /** Home page */
  app.get('/', (c) => {
    const unis = listUnis(openclawDir);
    const stats: HomeStats = {
      totalUnis: unis.length,
      totalAgents: unis.reduce((sum, u) => sum + u.agentIds.length, 0),
      uniTypes: {},
    };
    for (const uni of unis) {
      stats.uniTypes[uni.type] = (stats.uniTypes[uni.type] ?? 0) + 1;
    }

    // Collect extension panels from all registered extensions
    const extensionPanels: Array<{ title: string; html: string }> = [];
    if (config.extensions) {
      for (const ext of config.extensions) {
        if (ext.panels) {
          for (const panel of ext.panels) {
            try {
              extensionPanels.push({ title: panel.title, html: panel.renderHtml() });
            } catch (err) {
              console.warn(`[Dashboard] Extension panel "${panel.title}" render failed:`, err);
              extensionPanels.push({
                title: panel.title,
                html: '<p class="text-red-400 text-sm">面板渲染失败</p>',
              });
            }
          }
        }
      }
    }

    return c.html(renderHomePage(unis, stats, extensionPanels.length > 0 ? extensionPanels : undefined));
  });

  /** Uni detail page */
  app.get('/uni/:id', (c) => {
    const id = c.req.param('id');
    const entry = getUni(id, openclawDir);
    if (!entry) {
      return c.html(renderHomePage(listUnis(openclawDir), {
        totalUnis: 0, totalAgents: 0, uniTypes: {},
      }), 404);
    }

    const uniConfig = loadUniverseConfig(entry.specPath);
    const workspaceStatus: Record<string, { hasSoul: boolean; hasTask: boolean; hasSubmission: boolean }> = {};
    for (const agentId of entry.agentIds) {
      workspaceStatus[agentId] = getWorkspaceStatus(openclawDir, agentId);
    }

    return c.html(renderUniDetailPage({ entry, config: uniConfig, workspaceStatus }));
  });

  /** Agent detail page */
  app.get('/uni/:id/agent/:agentId', (c) => {
    const uniId = c.req.param('id');
    const agentId = c.req.param('agentId');
    const entry = getUni(uniId, openclawDir);
    if (!entry) return c.notFound();

    const uniConfig = loadUniverseConfig(entry.specPath);
    const workspace = getWorkspaceStatus(openclawDir, agentId);

    return c.html(renderAgentDetailPage({ uniId, agentId, config: uniConfig, workspace }));
  });

  /** Relationship graph page */
  app.get('/uni/:id/relationships', (c) => {
    const id = c.req.param('id');
    const entry = getUni(id, openclawDir);
    if (!entry) return c.notFound();

    const uniConfig = loadUniverseConfig(entry.specPath);
    return c.html(renderRelationshipGraphPage({ entry, config: uniConfig }));
  });

  /** Manage page */
  app.get('/manage', (c) => {
    const unis = listUnis(openclawDir);
    const configExists = existsSync(join(openclawDir, 'openclaw.json'));
    const registryExists = existsSync(join(openclawDir, 'uni-registry.json'));
    const openclawConfig = readOpenClawConfig(openclawDir);
    const agentsList = (openclawConfig?.agents as Record<string, unknown>)?.list;
    const totalAgentsInConfig = Array.isArray(agentsList) ? agentsList.length : 0;

    return c.html(renderManagePage(unis, {
      openclawDir,
      configExists,
      registryExists,
      totalAgentsInConfig,
    }));
  });

  /** User guide page */
  app.get('/guide', (c) => {
    return c.html(renderGuidePage());
  });

  // ─── Extension Routes ─────────────────────────

  if (config.extensions) {
    for (const ext of config.extensions) {
      app.route(`/ext/${ext.uniId}`, ext.routes);
    }
  }

  return app;
}

// ─── Helpers ──────────────────────────────────────

function loadUniverseConfig(specPath: string) {
  if (!existsSync(specPath)) return null;
  try {
    return parseSpecFile(specPath);
  } catch {
    return null;
  }
}

function getWorkspaceStatus(openclawDir: string, agentId: string) {
  const workspacePath = join(openclawDir, `workspace-${agentId}`);
  return {
    hasSoul: existsSync(join(workspacePath, 'SOUL.md')),
    hasTask: existsSync(join(workspacePath, 'TASK.md')),
    hasSubmission: existsSync(join(workspacePath, 'SUBMISSION.md')),
  };
}
