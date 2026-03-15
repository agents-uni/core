/**
 * Dashboard Server — universal web UI for managing agent universes.
 *
 * Provides a browser-based dashboard that works with ANY type of uni.
 * Specific unis (like zhenhuan-uni) can inject extension panels.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createDashboardRoutes } from './api.js';
import { join } from 'node:path';

// ─── Types ────────────────────────────────────────

export interface DashboardConfig {
  /** Server port (default: 8089) */
  port: number;
  /** OpenClaw base directory (default: ~/.openclaw) */
  openclawDir?: string;
  /** Extension panels from specific unis */
  extensions?: DashboardExtension[];
}

export interface DashboardExtension {
  /** Universe ID this extension belongs to */
  uniId: string;
  /** Hono routes mounted at /ext/:uniId/ */
  routes: Hono;
  /** Extra panels displayed on the home page */
  panels?: PanelDefinition[];
}

export interface PanelDefinition {
  /** Panel title */
  title: string;
  /** Returns HTML fragment for the panel */
  renderHtml: () => string;
}

// ─── Server ───────────────────────────────────────

export async function startDashboard(config: DashboardConfig): Promise<void> {
  const { port } = config;

  const app = new Hono();

  // Middleware
  app.use('*', cors());
  app.use('*', logger());

  // Mount dashboard routes
  const dashboard = createDashboardRoutes(config);
  app.route('/', dashboard);

  const openclawDir = config.openclawDir ?? join(
    process.env.HOME ?? process.env.USERPROFILE ?? '.',
    '.openclaw'
  );

  const url = `http://localhost:${port}`;
  const extCount = config.extensions?.length ?? 0;

  console.log('');
  console.log('  \x1b[36m╔══════════════════════════════════════╗\x1b[0m');
  console.log('  \x1b[36m║\x1b[0m   \x1b[1m🌌 Uni Dashboard\x1b[0m                    \x1b[36m║\x1b[0m');
  console.log('  \x1b[36m╚══════════════════════════════════════╝\x1b[0m');
  console.log('');
  console.log(`  \x1b[36m首页:\x1b[0m      ${url}`);
  console.log(`  \x1b[36m管理:\x1b[0m      ${url}/manage`);
  console.log(`  \x1b[36m手册:\x1b[0m      ${url}/guide`);
  console.log(`  \x1b[36mAPI:\x1b[0m       ${url}/api/unis`);
  console.log(`  \x1b[36mOpenClaw:\x1b[0m  ${openclawDir}`);
  if (extCount > 0) {
    console.log(`  \x1b[36m扩展:\x1b[0m      ${extCount} 个已加载`);
  }
  console.log('');
  console.log('  \x1b[90m按 Ctrl+C 停止服务\x1b[0m');
  console.log('');

  serve({ fetch: app.fetch, port });
}
