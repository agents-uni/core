/**
 * Dashboard HTML Templates — server-side rendered pages.
 *
 * Uses Tailwind CDN for styling. No frontend framework needed.
 * All functions return HTML strings.
 */

import type { UniRegistryEntry } from '../bridge/uni-registry.js';
import type { UniverseConfig } from '../types/index.js';

// ─── Layout ───────────────────────────────────────

export function renderLayout(title: string, bodyHtml: string, activeNav?: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Uni Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            surface: { DEFAULT: '#0f172a', light: '#1e293b', lighter: '#334155' },
            accent: { DEFAULT: '#818cf8', light: '#a5b4fc', dark: '#6366f1' },
          }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
    .card-hover { transition: transform 0.15s, box-shadow 0.15s; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
    .glow { box-shadow: 0 0 20px rgba(129, 140, 248, 0.15); }
    .gradient-text { background: linear-gradient(135deg, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: fadeIn 0.4s ease-out forwards; }
    .animate-in-delay-1 { animation-delay: 0.1s; opacity: 0; }
    .animate-in-delay-2 { animation-delay: 0.2s; opacity: 0; }
    .animate-in-delay-3 { animation-delay: 0.3s; opacity: 0; }
  </style>
</head>
<body class="bg-surface text-gray-200 min-h-screen">
  <!-- Navigation -->
  <nav class="bg-surface-light border-b border-gray-700/50 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3 text-white hover:text-accent-light transition">
        <span class="text-2xl">🌌</span>
        <span class="font-bold text-lg">Uni Dashboard</span>
      </a>
      <div class="flex items-center gap-6 text-sm">
        <a href="/" class="${activeNav === 'home' ? 'text-accent-light' : 'text-gray-400 hover:text-white'} transition">首页</a>
        <a href="/manage" class="${activeNav === 'manage' ? 'text-accent-light' : 'text-gray-400 hover:text-white'} transition">管理</a>
        <a href="/guide" class="${activeNav === 'guide' ? 'text-accent-light' : 'text-gray-400 hover:text-white'} transition">手册</a>
        <a href="/api/health" class="text-gray-400 hover:text-white transition">API</a>
      </div>
    </div>
  </nav>

  <!-- Content -->
  <main class="max-w-7xl mx-auto px-6 py-8">
    ${bodyHtml}
  </main>

  <!-- Footer -->
  <footer class="border-t border-gray-700/50 mt-16 py-6 text-center text-gray-500 text-sm">
    @agents-uni/core Dashboard · Powered by Hono
  </footer>
</body>
</html>`;
}

// ─── Home Page ────────────────────────────────────

export interface HomeStats {
  totalUnis: number;
  totalAgents: number;
  uniTypes: Record<string, number>;
}

export function renderHomePage(unis: UniRegistryEntry[], stats: HomeStats, extensionPanels?: Array<{ title: string; html: string }>): string {
  const typeColors: Record<string, string> = {
    hierarchical: 'bg-blue-500/20 text-blue-300',
    flat: 'bg-green-500/20 text-green-300',
    competitive: 'bg-red-500/20 text-red-300',
    hybrid: 'bg-purple-500/20 text-purple-300',
  };

  // ─── Hero Section ─────────────────────────────
  const heroHtml = `
    <div class="text-center py-12 mb-8 animate-in">
      <div class="text-6xl mb-6">🌌</div>
      <h1 class="text-4xl md:text-5xl font-bold mb-4">
        <span class="gradient-text">Uni Dashboard</span>
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
        Agent 组织管理与监控中心 — 查看已部署的 Agent、它们之间的关系、管理多个 Uni 的生命周期
      </p>
      <div class="flex justify-center gap-4 text-sm">
        <a href="/guide" class="px-5 py-2.5 bg-accent/20 text-accent-light rounded-lg hover:bg-accent/30 transition border border-accent/30">
          📖 用户手册
        </a>
        <a href="/manage" class="px-5 py-2.5 bg-surface-light text-gray-300 rounded-lg hover:bg-surface-lighter transition border border-gray-700/50">
          ⚙️ 管理中心
        </a>
      </div>
    </div>
  `;

  // ─── Quick Start ──────────────────────────────
  const quickStartHtml = unis.length === 0 ? `
    <div class="bg-surface-light rounded-xl p-8 border border-gray-700/50 mb-8 animate-in animate-in-delay-1">
      <h2 class="text-xl font-semibold text-white mb-4">🚀 快速开始</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div class="space-y-2">
          <div class="text-accent-light font-medium">Step 1: 定义 Universe</div>
          <p class="text-gray-400">创建 <code class="bg-surface px-1.5 py-0.5 rounded text-accent-light text-xs">universe.yaml</code> 描述你的 Agent 组织结构</p>
        </div>
        <div class="space-y-2">
          <div class="text-accent-light font-medium">Step 2: 部署</div>
          <p class="text-gray-400">运行 <code class="bg-surface px-1.5 py-0.5 rounded text-accent-light text-xs">uni deploy universe.yaml</code></p>
        </div>
        <div class="space-y-2">
          <div class="text-accent-light font-medium">Step 3: 监控</div>
          <p class="text-gray-400">回到此页面查看 Agent 状态和关系</p>
        </div>
      </div>
    </div>
  ` : '';

  // ─── Stats Section ────────────────────────────
  const statsHtml = stats.totalUnis > 0 ? `
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in animate-in-delay-1">
      <div class="bg-surface-light rounded-xl p-5 border border-gray-700/50 glow">
        <div class="text-3xl font-bold text-white">${stats.totalUnis}</div>
        <div class="text-gray-400 text-sm mt-1">已部署 Uni</div>
      </div>
      <div class="bg-surface-light rounded-xl p-5 border border-gray-700/50">
        <div class="text-3xl font-bold text-white">${stats.totalAgents}</div>
        <div class="text-gray-400 text-sm mt-1">总 Agent 数</div>
      </div>
      ${Object.entries(stats.uniTypes).map(([type, count]) => `
        <div class="bg-surface-light rounded-xl p-5 border border-gray-700/50">
          <div class="text-3xl font-bold text-white">${count}</div>
          <div class="text-gray-400 text-sm mt-1">${type} 类型</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // ─── Uni Cards ────────────────────────────────
  const unisHtml = unis.length === 0
    ? `<div class="text-center py-16 animate-in animate-in-delay-2">
        <div class="text-5xl mb-4">🌑</div>
        <h2 class="text-xl text-gray-400 mb-2">尚无已部署的 Uni</h2>
        <p class="text-gray-500">运行 <code class="bg-surface-lighter px-2 py-1 rounded text-accent-light">uni deploy universe.yaml</code> 来部署你的第一个 Uni</p>
      </div>`
    : `
      <div class="mb-6 animate-in animate-in-delay-2">
        <h2 class="text-xl font-semibold text-white">已部署的 Uni</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in animate-in-delay-2">
        ${unis.map(uni => `
          <a href="/uni/${encodeURIComponent(uni.id)}" class="card-hover bg-surface-light rounded-xl p-6 border border-gray-700/50 block">
            <div class="flex items-start justify-between mb-3">
              <h3 class="font-semibold text-white text-lg">${escapeHtml(uni.id)}</h3>
              <span class="badge ${typeColors[uni.type] ?? 'bg-gray-500/20 text-gray-300'}">${uni.type}</span>
            </div>
            <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(uni.description)}</p>
            <div class="flex items-center justify-between text-xs text-gray-500">
              <span>🤖 ${uni.agentIds.length} agents</span>
              <span>v${escapeHtml(uni.version)}</span>
            </div>
            <div class="mt-3 text-xs text-gray-600">
              部署于 ${formatDate(uni.deployedAt)}
            </div>
          </a>
        `).join('')}
      </div>`;

  // ─── Extension Panels ────────────────────────
  const extensionHtml = extensionPanels && extensionPanels.length > 0
    ? `
      <div class="mt-10 mb-2 animate-in animate-in-delay-2">
        <h2 class="text-xl font-semibold text-white mb-4">📊 实时数据面板</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in animate-in-delay-3">
        ${extensionPanels.map(panel => `
          <div class="bg-surface-light rounded-xl border border-gray-700/50 overflow-hidden">
            <div class="px-5 py-3 border-b border-gray-700/50 bg-surface-lighter/30">
              <h3 class="text-sm font-semibold text-white">${escapeHtml(panel.title)}</h3>
            </div>
            <div class="p-5">
              ${panel.html}
            </div>
          </div>
        `).join('')}
      </div>
    `
    : '';

  // ─── Architecture Overview ────────────────────
  const archHtml = `
    <div class="mt-12 bg-surface-light rounded-xl p-8 border border-gray-700/50 animate-in animate-in-delay-3">
      <h2 class="text-xl font-semibold text-white mb-6">🏗️ 架构概览</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
        <div class="bg-surface rounded-xl p-5 border border-gray-700/30">
          <div class="text-2xl mb-3">📐</div>
          <div class="text-white font-medium mb-2">agents-uni-core</div>
          <p class="text-gray-400">通用协议层 — 定义 Agent 组织、关系、治理、进化的规范和运行时</p>
        </div>
        <div class="bg-surface rounded-xl p-5 border border-gray-700/30">
          <div class="text-2xl mb-3">🎭</div>
          <div class="text-white font-medium mb-2">具体 Uni 实例</div>
          <p class="text-gray-400">如 zhenhuan-uni（后宫赛马）、公司制 uni 等 — 基于 core 构建的特化系统</p>
        </div>
        <div class="bg-surface rounded-xl p-5 border border-gray-700/30">
          <div class="text-2xl mb-3">🔗</div>
          <div class="text-white font-medium mb-2">OpenClaw 桥接</div>
          <p class="text-gray-400">通过文件协议（SOUL.md / TASK.md / SUBMISSION.md）与 OpenClaw Agent 通信</p>
        </div>
      </div>
    </div>
  `;

  const body = `
    ${heroHtml}
    ${quickStartHtml}
    ${statsHtml}
    ${unisHtml}
    ${extensionHtml}
    ${archHtml}
  `;

  return renderLayout('首页', body, 'home');
}

// ─── Guide Page ──────────────────────────────────

export function renderGuidePage(): string {
  const codeBlock = (code: string, lang = '') => `<pre class="bg-surface rounded-lg p-4 border border-gray-700/30 overflow-x-auto text-xs leading-relaxed"><code class="text-gray-300">${escapeHtml(code)}</code></pre>`;

  const body = `
    <div class="mb-8">
      <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition">&larr; 返回首页</a>
    </div>

    <h1 class="text-3xl font-bold text-white mb-2">📖 用户手册</h1>
    <p class="text-gray-400 mb-4">从零开始了解 Uni 系统的完整指南 — 事无巨细版</p>

    <!-- TOC -->
    <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50 mb-8">
      <h2 class="text-lg font-semibold text-white mb-3">目录</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
        <a href="#what-is-uni" class="text-accent-light hover:underline py-1">1. 什么是 Uni？</a>
        <a href="#prerequisites" class="text-accent-light hover:underline py-1">2. 前置要求 &amp; 安装</a>
        <a href="#quick-start" class="text-accent-light hover:underline py-1">3. 从零开始：5 分钟快速上手</a>
        <a href="#universe-yaml" class="text-accent-light hover:underline py-1">4. universe.yaml 完整语法</a>
        <a href="#uni-types" class="text-accent-light hover:underline py-1">5. Uni 类型与组织模板</a>
        <a href="#deploy" class="text-accent-light hover:underline py-1">6. 部署到 OpenClaw</a>
        <a href="#openclaw" class="text-accent-light hover:underline py-1">7. OpenClaw 使用指南</a>
        <a href="#file-protocol" class="text-accent-light hover:underline py-1">8. 文件协议详解</a>
        <a href="#directory" class="text-accent-light hover:underline py-1">9. 目录结构一览</a>
        <a href="#cli-uni" class="text-accent-light hover:underline py-1">10. Uni CLI 命令参考</a>
        <a href="#cli-openclaw" class="text-accent-light hover:underline py-1">11. OpenClaw CLI 命令参考</a>
        <a href="#api-ref" class="text-accent-light hover:underline py-1">12. Dashboard REST API</a>
        <a href="#multi-uni" class="text-accent-light hover:underline py-1">13. 多 Uni 管理</a>
        <a href="#lifecycle" class="text-accent-light hover:underline py-1">14. 生命周期：重置 vs 清理 vs 更新</a>
        <a href="#extension" class="text-accent-light hover:underline py-1">15. Dashboard 扩展机制</a>
        <a href="#troubleshooting" class="text-accent-light hover:underline py-1">16. 常见问题排查</a>
      </div>
    </div>

    <div class="space-y-8">

      <!-- 1. What is Uni -->
      <div id="what-is-uni" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">1. 什么是 Uni？</h2>
        <div class="text-gray-300 text-sm space-y-3">
          <p><strong class="text-white">Uni（Universe）</strong>是一个 Agent 组织的完整定义。当前的多 Agent 框架解决的是<em>生产力</em>问题 — 如何让 Agent 完成任务。但它们忽略了<em>生产关系</em> — Agent 之间如何组织、治理和进化。</p>
          <p>Uni 系统用一个 YAML 文件定义一个完整的 Agent 社会：</p>
          <ul class="space-y-2 ml-4">
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Agents</strong> — 组织中的成员，每个有 ID、名字、角色（title + duties + permissions）、特征值（traits）</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Relationships</strong> — 成员之间的有向关系（superior/subordinate/ally/rival/advisor...），带权重</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Governance</strong> — 决策模型（autocratic/democratic/consensus）、权限矩阵、审批流程</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Protocols</strong> — 工作流状态机（如赛马流程：announced &rarr; competing &rarr; judging &rarr; rewarded）</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Resources</strong> — 有限/可再生/位置性资源的定义与分配策略</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Evolution</strong> — 基于表现的晋升/降级/淘汰规则，绩效窗口和阈值</li>
          </ul>
          <p class="mt-4">Uni 系统分两层：</p>
          <ul class="space-y-2 ml-4">
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">@agents-uni/core</strong> — 通用协议层，定义 YAML 规范、解析器、验证器、运行时引擎、Dashboard、OpenClaw 桥接</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">具体 Uni 实例</strong>（如 zhenhuan-uni）— 基于 core 构建的特化竞争系统，实现 ELO、赛马、品级等领域逻辑</li>
          </ul>
        </div>
      </div>

      <!-- 2. Prerequisites -->
      <div id="prerequisites" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">2. 前置要求 &amp; 安装</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <div>
            <div class="text-white font-medium mb-2">必须安装</div>
            <ul class="space-y-1 ml-4">
              <li class="flex gap-2"><span class="text-green-400">✓</span> <strong>Node.js</strong> &ge; 18（推荐 v22+）</li>
              <li class="flex gap-2"><span class="text-green-400">✓</span> <strong>npm</strong> &ge; 9</li>
              <li class="flex gap-2"><span class="text-green-400">✓</span> <strong>OpenClaw</strong> — Agent 运行时。安装方式：<code class="bg-surface px-1.5 py-0.5 rounded text-accent-light text-xs">npm install -g openclaw</code></li>
            </ul>
          </div>
          <div>
            <div class="text-white font-medium mb-2">验证安装</div>
            ${codeBlock(`# 检查 Node 版本
node --version    # 应输出 v18+ 或 v22+

# 检查 OpenClaw 版本
openclaw --version   # 应输出 2026.x.x

# OpenClaw 首次配置（如果还未配置过）
openclaw config      # 交互式向导，设置 API Key 等`)}
          </div>
          <div>
            <div class="text-white font-medium mb-2">安装 agents-uni-core</div>
            ${codeBlock(`# 作为 npm 包安装（如果你要开发自己的 Uni）
npm install @agents-uni/core

# 或者克隆源码
git clone <repo-url>
cd agents-uni-core && npm install`)}
          </div>
        </div>
      </div>

      <!-- 3. Quick Start -->
      <div id="quick-start" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">3. 从零开始：5 分钟快速上手</h2>
        <div class="text-sm space-y-5">
          <div class="flex gap-4 items-start">
            <div class="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div class="flex-1">
              <div class="text-white font-medium">创建项目</div>
              ${codeBlock(`# 脚手架创建新 Uni 项目（可选模板：competitive / corporation / flat / government / military）
npx create-uni my-universe --template competitive
cd my-universe`)}
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div class="flex-1">
              <div class="text-white font-medium">编辑 universe.yaml</div>
              <p class="text-gray-400 mt-1 mb-2">定义你的 Agent 组织。下面是一个最简示例：</p>
              ${codeBlock(`name: my-team
type: corporation
version: "0.1.0"
description: 一个敏捷开发团队

agents:
  - id: tech-lead
    name: 技术负责人
    role:
      title: Technical Lead
      duties: [架构设计, 代码审查]
      permissions: [approve, reject]
    rank: 80

  - id: dev-alpha
    name: 开发者 Alpha
    role:
      title: Software Engineer
      duties: [功能开发, 测试]
      permissions: [call]
    rank: 50
    traits:
      creativity: 0.8
      speed: 0.7

relationships:
  - from: tech-lead
    to: dev-alpha
    type: supervises
    weight: 0.9

governance:
  decisionModel: autocratic
  permissionMatrix:
    - actor: tech-lead
      target: dev-alpha
      actions: [approve, reject, assign]
  reviewPolicy:
    mandatory: true
    reviewers: [tech-lead]
    maxRounds: 3`)}
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div class="flex-1">
              <div class="text-white font-medium">验证 &amp; 部署</div>
              ${codeBlock(`# 验证格式
npx uni validate universe.yaml

# 预览部署（不实际写入文件）
npx uni deploy universe.yaml --dry-run

# 正式部署到 OpenClaw
npx uni deploy universe.yaml
# 输出：
#   ✓ 生成 SOUL.md × 2
#   ✓ 创建 workspace-tech-lead/, workspace-dev-alpha/
#   ✓ 创建 agents/tech-lead/agent/, agents/dev-alpha/agent/
#   ✓ 注册 2 个 Agent 到 openclaw.json
#   ✓ 注册 Universe "my-team" 到 uni-registry.json`)}
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center font-bold flex-shrink-0">4</div>
            <div class="flex-1">
              <div class="text-white font-medium">启动 Dashboard</div>
              ${codeBlock(`# 启动 Web 仪表盘（默认端口 8089）
npx uni dashboard

# 或指定端口
npx uni dashboard --port 3000

# 浏览器打开 http://localhost:8089 即可看到首页`)}
            </div>
          </div>
          <div class="flex gap-4 items-start">
            <div class="w-8 h-8 rounded-full bg-accent/20 text-accent-light flex items-center justify-center font-bold flex-shrink-0">5</div>
            <div class="flex-1">
              <div class="text-white font-medium">验证部署结果</div>
              ${codeBlock(`# 用 OpenClaw CLI 查看已注册的 Agent
openclaw agents list
# 输出类似：
#   tech-lead    Technical Lead
#   dev-alpha    Software Engineer

# 查看生成的 SOUL.md
cat ~/.openclaw/workspace-tech-lead/SOUL.md

# 手动触发一次 Agent 执行
openclaw agent --agent tech-lead --message "请审查以下代码..."`)}
            </div>
          </div>
        </div>
      </div>

      <!-- 4. universe.yaml -->
      <div id="universe-yaml" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">4. universe.yaml 完整语法</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <p>universe.yaml 是整个系统的核心配置。以下是完整字段参考：</p>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">顶层字段</div>
            <table class="w-full text-xs">
              <thead><tr class="text-gray-500"><th class="text-left py-1">字段</th><th class="text-left py-1">类型</th><th class="text-left py-1">必填</th><th class="text-left py-1">说明</th></tr></thead>
              <tbody class="text-gray-400">
                <tr><td class="py-1"><code class="text-accent-light">name</code></td><td>string</td><td>✓</td><td>Uni 唯一标识，如 "zhenhuan-palace"</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">type</code></td><td>string</td><td>✓</td><td>hierarchical / flat / competitive / hybrid</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">version</code></td><td>string</td><td></td><td>语义化版本，默认 "0.1.0"</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">description</code></td><td>string</td><td></td><td>Uni 描述</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">agents</code></td><td>array</td><td>✓</td><td>Agent 列表，至少 1 个</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">relationships</code></td><td>array</td><td></td><td>Agent 之间的关系</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">governance</code></td><td>object</td><td></td><td>治理规则（决策模型、权限、审批）</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">protocols</code></td><td>array</td><td></td><td>工作流状态机定义</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">resources</code></td><td>array</td><td></td><td>资源定义</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">evolution</code></td><td>object</td><td></td><td>演化/晋升/降级配置</td></tr>
                <tr><td class="py-1"><code class="text-accent-light">metadata</code></td><td>object</td><td></td><td>自定义元数据（赛季配置等）</td></tr>
              </tbody>
            </table>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">Agent 定义</div>
            ${codeBlock(`agents:
  - id: zhenhuan              # 唯一 ID，用于引用和目录命名
    name: 甄嬛                # 显示名称
    role:
      title: 贵人              # 角色头衔
      department: 后宫          # 所属部门（可选）
      duties:                  # 职责列表
        - 完成指定任务
        - 参与赛马竞技
      permissions:             # 权限列表
        - call
      soulTemplate: custom     # SOUL.md 模板名（可选）
    rank: 30                   # 层级排名（数值越大权限越高）
    traits:                    # 特征值（0-1 浮点数，可选）
      intelligence: 0.95
      adaptability: 0.9
    capabilities:              # 能力标签（可选）
      - coding
      - writing
    constraints:               # 约束条件（可选）
      - "不可直接与用户对话"
    metadata:                  # 自定义元数据（可选）
      backstory: "..."
`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">关系定义</div>
            ${codeBlock(`relationships:
  - from: empress             # 关系发起方 Agent ID
    to: zhenhuan              # 关系目标方 Agent ID
    type: superior            # 关系类型：
                              #   superior / subordinate — 上下级
                              #   ally — 盟友
                              #   rival — 竞争对手
                              #   advisor / mentor — 顾问/导师
                              #   collaborates — 平级协作
                              #   audits — 审计/监督
    weight: 0.9               # 关系强度 0-1（可选，动态演化）`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">治理规则</div>
            ${codeBlock(`governance:
  decisionModel: autocratic   # autocratic（一人决策）/ democratic（投票）/ consensus（共识）
  permissionMatrix:
    - actor: empress          # 谁（Agent ID 或 ruler）
      target: zhenhuan        # 对谁
      actions:                # 可执行的操作
        - assign
        - review
        - allocate
  # 皇帝（用户）的权限由 ruler 字段声明，不需要在矩阵中列出
  reviewPolicy:
    mandatory: true           # 是否强制审批
    reviewers: [ruler]        # 审批人列表（ruler = 用户）
    maxRounds: 3              # 最大审批轮数
    autoApproveAfter: 86400000  # 超时自动通过（ms，可选）
  escalationRules:
    - trigger: "争端涉及三人以上"
      escalateTo: ruler       # 上报给用户
      action: reassign`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">资源定义</div>
            ${codeBlock(`resources:
  - name: 圣宠               # 资源名称
    type: finite              # finite（有限）/ renewable（可再生）/ positional（位置性）
    total: 1000               # 总量
    distribution: competitive # equal / hierarchy / merit / competitive
    decayRate: 0.05           # 衰减率 — 每周期减少 5%（可选）
    refreshInterval: 2592000000  # 刷新间隔，ms（仅 renewable）
    description: 核心影响力指标`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">演化配置</div>
            ${codeBlock(`evolution:
  performanceWindow: 50       # 评估窗口：最近 N 次表现
  promotionThreshold: 75      # 晋升阈值（绩效分 0-100）
  demotionThreshold: 30       # 降级阈值
  memoryRetention: 1000       # 组织记忆保留条数
  evolutionInterval: 604800000  # 演化周期（7 天，ms）`)}
          </div>
        </div>
      </div>

      <!-- 5. Uni Types -->
      <div id="uni-types" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">5. Uni 类型与组织模板</h2>
        <div class="text-sm space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
              <span class="badge bg-blue-500/20 text-blue-300 mb-2">hierarchical</span>
              <p class="text-gray-400 mt-2"><strong class="text-white">层级制</strong> — 明确的上下级，如公司组织、政府部门、军队。决策自上而下。</p>
              <p class="text-gray-500 mt-1 text-xs">模板：government, corporation, military</p>
            </div>
            <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
              <span class="badge bg-green-500/20 text-green-300 mb-2">flat</span>
              <p class="text-gray-400 mt-2"><strong class="text-white">扁平制</strong> — 平等协作，民主投票决策。适合开源社区、合伙制。</p>
              <p class="text-gray-500 mt-1 text-xs">模板：flat</p>
            </div>
            <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
              <span class="badge bg-red-500/20 text-red-300 mb-2">competitive</span>
              <p class="text-gray-400 mt-2"><strong class="text-white">竞争制</strong> — ELO 排名、赛马淘汰。裁判 + 选手模式，绩效导向。</p>
              <p class="text-gray-500 mt-1 text-xs">模板：competitive（如 zhenhuan-uni）</p>
            </div>
            <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
              <span class="badge bg-purple-500/20 text-purple-300 mb-2">hybrid</span>
              <p class="text-gray-400 mt-2"><strong class="text-white">混合制</strong> — 多种模型组合。部分层级、部分竞争、部分协作。</p>
              <p class="text-gray-500 mt-1 text-xs">默认类型，适合复杂组织</p>
            </div>
          </div>
          <p class="text-gray-400">使用脚手架创建特定模板的项目：</p>
          ${codeBlock(`npx create-uni my-project --template competitive
npx create-uni my-team --template corporation
npx create-uni my-community --template flat`)}
        </div>
      </div>

      <!-- 6. Deploy -->
      <div id="deploy" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">6. 部署到 OpenClaw</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <p><code class="bg-surface px-1.5 py-0.5 rounded text-accent-light text-xs">uni deploy</code> 是核心命令，它完成以下全部操作：</p>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">部署做了什么？</div>
            <ol class="space-y-1 ml-4 text-gray-400 list-decimal list-inside">
              <li>读取 <code class="text-accent-light">universe.yaml</code>，解析和验证</li>
              <li>为每个 Agent 生成 <strong class="text-white">SOUL.md</strong>（人格定义文件）</li>
              <li>创建 <strong class="text-white">workspace 目录</strong>：<code class="text-accent-light">~/.openclaw/workspace-{id}/</code></li>
              <li>将 SOUL.md 写入对应的 workspace 目录</li>
              <li>创建 <strong class="text-white">Agent 运行时目录</strong>：<code class="text-accent-light">~/.openclaw/agents/{id}/agent/</code> 和 <code class="text-accent-light">agents/{id}/sessions/</code></li>
              <li>将 Agent 注册到 <code class="text-accent-light">~/.openclaw/openclaw.json</code>（含 workspace + agentDir 字段）</li>
              <li>将 Universe 注册到 <code class="text-accent-light">~/.openclaw/uni-registry.json</code></li>
              <li>生成 <strong class="text-white">权限矩阵参考文件</strong>：<code class="text-accent-light">~/.openclaw/{name}-permissions.md</code></li>
            </ol>
          </div>

          ${codeBlock(`# 基本部署
npx uni deploy universe.yaml

# 指定 OpenClaw 目录（默认 ~/.openclaw）
npx uni deploy universe.yaml --dir /path/to/openclaw

# 指定 SOUL.md 语言（zh 中文 / en 英文）
npx uni deploy universe.yaml --lang zh

# 预览模式 — 显示将要做什么但不实际执行
npx uni deploy universe.yaml --dry-run`)}

          <div class="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
            <div class="text-yellow-300 font-medium mb-1">⚠️ 注意</div>
            <ul class="text-yellow-200/70 space-y-1 text-xs">
              <li>• 重复部署是安全的 — 已注册的 Agent 不会重复添加到 openclaw.json</li>
              <li>• 但 SOUL.md 会被覆盖。如果你手动编辑过 SOUL.md，部署前请备份</li>
              <li>• 部署前确保 OpenClaw 已安装且 <code>~/.openclaw/</code> 目录存在</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 7. OpenClaw -->
      <div id="openclaw" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">7. OpenClaw 使用指南</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <p>OpenClaw 是 Agent 的运行时环境。Agent 在 OpenClaw 中被执行，Uni 系统通过文件协议与 OpenClaw 交互。</p>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">OpenClaw 核心概念</div>
            <ul class="space-y-2 ml-4 text-gray-400">
              <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Agent</strong> — 一个独立的 AI 实体，有自己的 workspace 和会话历史</li>
              <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Gateway</strong> — WebSocket 网关，管理所有 Agent 的执行（默认端口 18789）</li>
              <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Workspace</strong> — Agent 的工作目录，包含 SOUL.md、TASK.md、SUBMISSION.md 等文件</li>
              <li class="flex gap-2"><span class="text-accent-light">•</span> <strong class="text-white">Session</strong> — 一次 Agent 执行会话，保存在 agents/{id}/sessions/ 下</li>
            </ul>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">常用 OpenClaw 命令</div>
            ${codeBlock(`# 首次配置（设置 API Key、默认模型等）
openclaw config

# 查看所有已注册的 Agent
openclaw agents list

# 添加新 Agent（uni deploy 会自动完成，但也可手动）
openclaw agents add --id my-agent --name "我的Agent"

# 直接与某个 Agent 对话
openclaw agent --agent zhenhuan --message "请完成以下任务..."

# 启动 Gateway（前台运行）
openclaw gateway run

# 启动 Gateway（作为系统服务，后台运行）
openclaw gateway start

# 查看 Gateway 状态
openclaw gateway status

# 检查系统健康
openclaw doctor

# 查看日志
openclaw logs --tail 50`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">openclaw.json 配置结构</div>
            <p class="text-gray-400 mb-2">部署后，<code class="text-accent-light">~/.openclaw/openclaw.json</code> 中的 agents 列表格式：</p>
            ${codeBlock(`{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "maxConcurrent": 4
    },
    "list": [
      {
        "id": "empress",
        "name": "皇后",
        "workspace": "~/.openclaw/workspace-empress",
        "agentDir": "~/.openclaw/agents/empress/agent"
      },
      {
        "id": "zhenhuan",
        "name": "甄嬛",
        "workspace": "~/.openclaw/workspace-zhenhuan",
        "agentDir": "~/.openclaw/agents/zhenhuan/agent"
      }
    ]
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  }
}`)}
          </div>
        </div>
      </div>

      <!-- 8. File Protocol -->
      <div id="file-protocol" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">8. 文件协议详解</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <p>Uni 系统通过在 OpenClaw workspace 中读写 Markdown 文件与 Agent 通信。这是一种<strong class="text-white">零耦合</strong>的集成方式 — Agent 不需要实现任何 HTTP 接口。</p>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-surface rounded-lg p-4 border border-green-700/30">
              <div class="text-green-400 font-mono font-medium mb-2">SOUL.md</div>
              <div class="text-xs text-gray-500 mb-2">写入时机：<code>uni deploy</code> 部署时</div>
              <p class="text-gray-400">Agent 的人格定义 — 身份、职责、性格、评判标准。相当于 Agent 的"宪法"。</p>
              <div class="mt-2 text-xs text-gray-500">路径：<code>~/.openclaw/workspace-{id}/SOUL.md</code></div>
            </div>
            <div class="bg-surface rounded-lg p-4 border border-yellow-700/30">
              <div class="text-yellow-400 font-mono font-medium mb-2">TASK.md</div>
              <div class="text-xs text-gray-500 mb-2">写入时机：每次任务调度时</div>
              <p class="text-gray-400">当前任务描述 — 标题、要求、评判标准、时间限制。由 TaskDispatcher 写入，Agent 读取并执行。</p>
              <div class="mt-2 text-xs text-gray-500">路径：<code>~/.openclaw/workspace-{id}/TASK.md</code></div>
            </div>
            <div class="bg-surface rounded-lg p-4 border border-blue-700/30">
              <div class="text-blue-400 font-mono font-medium mb-2">SUBMISSION.md</div>
              <div class="text-xs text-gray-500 mb-2">写入时机：Agent 完成任务后</div>
              <p class="text-gray-400">Agent 的产出 — 任务执行结果。Agent 自行写入，TaskDispatcher 轮询收集（默认每 2 秒检查一次）。</p>
              <div class="mt-2 text-xs text-gray-500">路径：<code>~/.openclaw/workspace-{id}/SUBMISSION.md</code></div>
            </div>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">完整调度流程</div>
            ${codeBlock(`1. Uni 系统调用 dispatchAndRace()
2. TaskDispatcher 为每个参赛 Agent 写入 TASK.md
3. OpenClaw 检测到 TASK.md 变化，触发 Agent 执行
4. Agent 读取 SOUL.md（人格）+ TASK.md（任务）
5. Agent 调用 Claude API 生成回答
6. Agent 将结果写入 SUBMISSION.md
7. TaskDispatcher 每 2s 轮询 SUBMISSION.md
8. 收集到所有提交（或超时），进入评审
9. 评审完成，更新 ELO，清理 TASK.md / SUBMISSION.md`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">SOUL.md 示例</div>
            ${codeBlock(`# 甄嬛 - 贵人

## 身份
你是后宫赛马体系中的参赛者——甄嬛。你需要在竞争中展现最佳表现。

## 核心职责
1. **完成指定任务** — 在赛马竞技中提交高质量的输出
2. **参与赛马竞技** — 与其他嫔妃公平竞争
3. **经营人际关系** — 寻找盟友，应对竞争对手

## 性格特质
- 智慧：善于从全局思考，找到最优策略
- 适应性：面对不同类型的任务都能灵活应对
- 坚韧：即使遇到挫折也不轻言放弃

## 行为准则
- 输出质量第一，速度第二
- 善用策略，但不损害他人
- 保持优雅，展现实力`)}
          </div>
        </div>
      </div>

      <!-- 9. Directory Structure -->
      <div id="directory" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">9. 目录结构一览</h2>
        <div class="text-gray-300 text-sm">
          ${codeBlock(`~/.openclaw/                           # OpenClaw 根目录
├── openclaw.json                     # 主配置（Agent 列表、Gateway、认证）
├── uni-registry.json                 # Uni 注册中心（跟踪所有已部署的 Universe）
├── zhenhuan-palace-permissions.md    # 权限矩阵参考（部署时自动生成）
│
├── agents/                           # Agent 运行时目录（仅嫔妃，皇帝是用户）
│   ├── empress/
│   │   ├── agent/                    # 运行时配置
│   │   └── sessions/                 # 会话历史（每次执行的记录）
│   ├── zhenhuan/
│   │   ├── agent/
│   │   └── sessions/
│   └── ...
│
├── workspace/                        # 默认 workspace（OpenClaw 自带的 main agent）
│   ├── SOUL.md
│   ├── IDENTITY.md                   # Agent 身份标识
│   ├── HEARTBEAT.md                  # 心跳状态
│   ├── USER.md                       # 用户上下文
│   ├── TOOLS.md                      # 可用工具
│   └── memory/                       # 会话记忆
│
├── workspace-empress/                # 皇后 Agent 的 workspace
│   ├── SOUL.md                       # ← uni deploy 生成
│   ├── TASK.md                       # ← TaskDispatcher 写入（运行时）
│   └── SUBMISSION.md                 # ← Agent 写入（运行时）
│
├── workspace-zhenhuan/               # 甄嬛 Agent 的 workspace
│   ├── SOUL.md
│   ├── TASK.md
│   └── SUBMISSION.md
│
├── credentials/                      # API 密钥存储
├── identity/                         # 身份配置
├── logs/                             # Gateway 日志
├── memory/                           # 全局记忆
├── skills/                           # 已安装的技能
└── cron/                             # 定时任务`)}
        </div>
      </div>

      <!-- 10. Uni CLI -->
      <div id="cli-uni" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">10. Uni CLI 命令参考</h2>
        <div class="text-sm space-y-3">
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni deploy &lt;file&gt;</code>
            <span class="text-gray-400 ml-3">部署 universe.yaml 到 OpenClaw</span>
            <div class="text-gray-500 text-xs mt-1">选项：<code>--dir</code> 指定目录, <code>--dry-run</code> 预览, <code>--lang zh|en</code> SOUL.md 语言</div>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni validate &lt;file&gt;</code>
            <span class="text-gray-400 ml-3">验证 universe.yaml 格式 — 检查 Schema + 语义（引用的 Agent 是否存在等）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni visualize &lt;file&gt;</code>
            <span class="text-gray-400 ml-3">在终端生成 ASCII 关系图</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni inspect &lt;file&gt; [--agent &lt;id&gt;]</code>
            <span class="text-gray-400 ml-3">详细检视 — 不加 --agent 显示全局概览，加则显示单个 Agent 详情</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni init [name]</code>
            <span class="text-gray-400 ml-3">交互式初始化新 Uni 项目（生成 universe.yaml 模板 + package.json）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni dashboard [--port 8089]</code>
            <span class="text-gray-400 ml-3">启动 Web 仪表盘（当前页面就是 Dashboard）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni list</code>
            <span class="text-gray-400 ml-3">列出所有已注册的 Uni（读取 uni-registry.json）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni status</code>
            <span class="text-gray-400 ml-3">部署概览 — 显示每个 Uni 的 Agent 数量、类型、版本</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni reset &lt;id&gt;</code>
            <span class="text-gray-400 ml-3">重置运行时数据（清除 sessions/TASK.md/SUBMISSION.md，保留 SOUL.md 和配置）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30">
            <code class="text-accent-light">uni cleanup &lt;id&gt;</code>
            <span class="text-gray-400 ml-3">彻底删除 Uni — workspace 目录 + agent 目录 + openclaw.json 条目 + 注册表条目</span>
          </div>
        </div>
      </div>

      <!-- 11. OpenClaw CLI -->
      <div id="cli-openclaw" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">11. OpenClaw CLI 命令参考</h2>
        <div class="text-gray-300 text-sm space-y-4">
          <p>以下是部署和运行 Agent 时最常用的 OpenClaw 命令：</p>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">Agent 管理</div>
            ${codeBlock(`openclaw agents list              # 列出所有已注册的 Agent
openclaw agents add               # 交互式添加新 Agent
openclaw agents delete             # 删除 Agent 及其 workspace
openclaw agents set-identity       # 修改 Agent 名称/图标`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">执行 Agent</div>
            ${codeBlock(`# 向指定 Agent 发送消息并执行
openclaw agent --agent zhenhuan --message "评审以下代码..."

# JSON 输出模式
openclaw agent --agent zhenhuan --message "写一首诗" --json

# 设置超时
openclaw agent --agent zhenhuan --message "..." --timeout 120`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">Gateway 管理</div>
            ${codeBlock(`openclaw gateway run               # 前台运行 Gateway
openclaw gateway start             # 作为系统服务后台运行
openclaw gateway status            # 查看服务状态
openclaw gateway health            # 健康检查`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">诊断与配置</div>
            ${codeBlock(`openclaw config                    # 交互式配置向导
openclaw config validate           # 验证当前配置
openclaw doctor                    # 全面健康检查 + 自动修复
openclaw logs --tail 50            # 查看最近日志`)}
          </div>
        </div>
      </div>

      <!-- 12. API Reference -->
      <div id="api-ref" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">12. Dashboard REST API</h2>
        <div class="text-sm space-y-2">
          <p class="text-gray-400 mb-3">Dashboard 提供 JSON API，可用 curl 或任何 HTTP 客户端调用：</p>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-green-500/20 text-green-300 w-14 justify-center">GET</span>
            <code class="text-gray-300">/api/unis</code>
            <span class="text-gray-500 ml-auto">所有 Uni 列表</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-green-500/20 text-green-300 w-14 justify-center">GET</span>
            <code class="text-gray-300">/api/unis/:id</code>
            <span class="text-gray-500 ml-auto">Uni 详情（Agent 列表 + 配置）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-green-500/20 text-green-300 w-14 justify-center">GET</span>
            <code class="text-gray-300">/api/unis/:id/agents/:agentId</code>
            <span class="text-gray-500 ml-auto">单个 Agent 详情 + workspace 状态</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-green-500/20 text-green-300 w-14 justify-center">GET</span>
            <code class="text-gray-300">/api/unis/:id/relationships</code>
            <span class="text-gray-500 ml-auto">关系图（nodes + edges 格式）</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-yellow-500/20 text-yellow-300 w-14 justify-center">POST</span>
            <code class="text-gray-300">/api/unis/:id/reset</code>
            <span class="text-gray-500 ml-auto">重置 Uni 运行时</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-red-500/20 text-red-300 w-14 justify-center">POST</span>
            <code class="text-gray-300">/api/unis/:id/cleanup</code>
            <span class="text-gray-500 ml-auto">彻底删除 Uni</span>
          </div>
          <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex gap-3 items-center">
            <span class="badge bg-green-500/20 text-green-300 w-14 justify-center">GET</span>
            <code class="text-gray-300">/api/health</code>
            <span class="text-gray-500 ml-auto">健康检查</span>
          </div>
          <div class="mt-4">
            <div class="text-white font-medium mb-2">调用示例</div>
            ${codeBlock(`# 列出所有 Uni
curl http://localhost:8089/api/unis | jq

# 查看某个 Uni 详情
curl http://localhost:8089/api/unis/zhenhuan-palace | jq

# 重置（清除运行时数据）
curl -X POST http://localhost:8089/api/unis/zhenhuan-palace/reset

# 健康检查
curl http://localhost:8089/api/health | jq`)}
          </div>
        </div>
      </div>

      <!-- 13. Multi-Uni -->
      <div id="multi-uni" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">13. 多 Uni 管理</h2>
        <div class="text-gray-300 text-sm space-y-3">
          <p>系统支持同时部署多个 Uni，每个 Uni 独立管理。所有信息存储在 <code class="bg-surface px-1.5 py-0.5 rounded text-accent-light text-xs">~/.openclaw/uni-registry.json</code>。</p>

          <div class="bg-surface rounded-lg p-4 border border-gray-700/30">
            <div class="text-white font-medium mb-2">uni-registry.json 格式</div>
            ${codeBlock(`{
  "version": "1.0.0",
  "unis": [
    {
      "id": "zhenhuan-palace",
      "description": "以甄嬛传后宫为背景的 Agent 竞争体系...",
      "specPath": "/path/to/zhenhuan-uni/universe.yaml",
      "type": "competitive",
      "agentIds": ["empress", "zhenhuan", "huafei", ...],
      "deployedAt": "2026-03-14T00:19:27.033Z",
      "updatedAt": "2026-03-14T01:36:00.378Z",
      "version": "0.1.0"
    },
    {
      "id": "my-team",
      "type": "corporation",
      ...
    }
  ]
}`)}
          </div>

          <ul class="space-y-2 ml-4">
            <li class="flex gap-2"><span class="text-accent-light">•</span> 每个 Uni 的 Agent 拥有独立的 workspace 和 agent 目录，互不冲突</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> 在 <a href="/" class="text-accent-light hover:underline">首页</a> 可以看到所有已部署 Uni 的卡片概览</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> 在 <a href="/manage" class="text-accent-light hover:underline">管理中心</a> 可以对每个 Uni 执行重置/清理操作</li>
            <li class="flex gap-2"><span class="text-accent-light">•</span> 点击任意 Uni 卡片可查看详情页 — Agent 列表、关系图谱、workspace 状态</li>
          </ul>
        </div>
      </div>

      <!-- 14. Lifecycle -->
      <div id="lifecycle" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">14. 生命周期：重置 vs 清理 vs 更新</h2>
        <div class="text-sm">
          <table class="w-full mb-4">
            <thead>
              <tr class="text-gray-500 text-left border-b border-gray-700/50">
                <th class="py-2 font-medium">操作</th>
                <th class="py-2 font-medium">命令</th>
                <th class="py-2 font-medium">做了什么</th>
                <th class="py-2 font-medium">保留什么</th>
              </tr>
            </thead>
            <tbody class="text-gray-400">
              <tr class="border-b border-gray-700/30">
                <td class="py-3"><span class="text-yellow-400">🔄 重置</span></td>
                <td class="py-3"><code class="text-accent-light">uni reset &lt;id&gt;</code></td>
                <td class="py-3">删除 sessions/、TASK.md、SUBMISSION.md</td>
                <td class="py-3">SOUL.md、openclaw.json 条目、注册信息</td>
              </tr>
              <tr class="border-b border-gray-700/30">
                <td class="py-3"><span class="text-red-400">🗑️ 清理</span></td>
                <td class="py-3"><code class="text-accent-light">uni cleanup &lt;id&gt;</code></td>
                <td class="py-3">删除全部：workspace/、agents/、openclaw.json 条目、注册信息</td>
                <td class="py-3">无 — 完全清除，如同从未部署过</td>
              </tr>
              <tr class="border-b border-gray-700/30">
                <td class="py-3"><span class="text-green-400">🔃 更新</span></td>
                <td class="py-3"><code class="text-accent-light">uni deploy</code>（重新执行）</td>
                <td class="py-3">重新生成 SOUL.md，新增 Agent 自动注册</td>
                <td class="py-3">已有 Agent 的 openclaw.json 条目不会重复添加</td>
              </tr>
            </tbody>
          </table>
          <div class="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
            <p class="text-yellow-200/70 text-xs"><strong class="text-yellow-300">使用场景：</strong>如果 Agent 的会话数据或提交结果变得混乱，使用<strong>重置</strong>。如果要完全卸载一个 Uni，使用<strong>清理</strong>。如果修改了 universe.yaml（增减 Agent 或改角色），重新执行<strong>部署</strong>即可。</p>
          </div>
        </div>
      </div>

      <!-- 15. Extension -->
      <div id="extension" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">15. Dashboard 扩展机制</h2>
        <div class="text-gray-300 text-sm space-y-3">
          <p>特定的 Uni 实例可以通过 <code class="text-accent-light">DashboardExtension</code> 接口向核心 Dashboard 注入自定义 API 路由和首页面板：</p>
          ${codeBlock(`import { Hono } from 'hono';
import { startDashboard } from '@agents-uni/core';
import type { DashboardExtension, PanelDefinition } from '@agents-uni/core';

// 创建扩展路由
const extRoutes = new Hono();
extRoutes.get('/leaderboard', (c) => c.json(getLeaderboard()));
extRoutes.get('/factions', (c) => c.json(getFactions()));

// 定义首页面板
const panels: PanelDefinition[] = [
  {
    title: 'ELO 排行榜',
    renderHtml: () => '<div>...排行榜 HTML...</div>',
  },
];

// 组装扩展
const extension: DashboardExtension = {
  uniId: 'my-uni',       // 扩展所属的 Uni ID
  routes: extRoutes,      // Hono 路由实例，挂载到 /ext/my-uni/
  panels,                 // 首页面板（可选）
};

// 启动 Dashboard 并加载扩展
await startDashboard({
  port: 8089,
  extensions: [extension],
});
// 扩展 API 路径：GET /ext/my-uni/leaderboard
// 扩展面板会自动显示在首页的「实时数据面板」区域`)}
        </div>
      </div>

      <!-- 16. Troubleshooting -->
      <div id="troubleshooting" class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
        <h2 class="text-xl font-semibold text-white mb-4">16. 常见问题排查</h2>
        <div class="text-sm space-y-4">

          <div class="bg-surface rounded-lg p-4 border border-red-700/20">
            <div class="text-red-300 font-medium mb-2">❌ <code>uni deploy</code> 报错 "找不到 universe.yaml"</div>
            <p class="text-gray-400">确认文件路径正确。deploy 命令需要完整路径或相对路径：</p>
            ${codeBlock(`# 正确
npx uni deploy ./universe.yaml
npx uni deploy /absolute/path/universe.yaml

# 错误 — 文件名拼写
npx uni deploy universe.yml  # 应为 .yaml`)}
          </div>

          <div class="bg-surface rounded-lg p-4 border border-red-700/20">
            <div class="text-red-300 font-medium mb-2">❌ 部署后 <code>openclaw agents list</code> 看不到 Agent</div>
            <p class="text-gray-400">检查 <code>~/.openclaw/openclaw.json</code> 中的 <code>agents.list</code> 是否包含你的 Agent。如果没有：</p>
            <ul class="text-gray-400 mt-1 ml-4 space-y-1">
              <li>• 确认部署时没有用 <code>--dry-run</code></li>
              <li>• 确认 <code>~/.openclaw/</code> 目录存在且有写权限</li>
              <li>• 尝试重新部署：<code>npx uni deploy universe.yaml</code></li>
            </ul>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-red-700/20">
            <div class="text-red-300 font-medium mb-2">❌ Dashboard 首页显示 "尚无已部署的 Uni"</div>
            <p class="text-gray-400">检查 <code>~/.openclaw/uni-registry.json</code> 是否存在且包含你的 Uni。可能原因：</p>
            <ul class="text-gray-400 mt-1 ml-4 space-y-1">
              <li>• 还没执行 <code>uni deploy</code></li>
              <li>• 部署时指定了不同的 <code>--dir</code> 目录</li>
              <li>• Dashboard 读取的 openclawDir 和部署的不一致</li>
            </ul>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-red-700/20">
            <div class="text-red-300 font-medium mb-2">❌ <code>openclaw agent</code> 执行失败</div>
            <p class="text-gray-400">常见原因：</p>
            <ul class="text-gray-400 mt-1 ml-4 space-y-1">
              <li>• API Key 未配置 — 运行 <code>openclaw config</code> 设置</li>
              <li>• Gateway 未启动 — 运行 <code>openclaw gateway run</code></li>
              <li>• Agent 的 SOUL.md 缺失 — 检查 workspace 目录</li>
            </ul>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-red-700/20">
            <div class="text-red-300 font-medium mb-2">❌ SUBMISSION.md 一直没有出现（轮询超时）</div>
            <p class="text-gray-400">说明 Agent 没有成功执行任务。检查：</p>
            <ul class="text-gray-400 mt-1 ml-4 space-y-1">
              <li>• OpenClaw Gateway 是否在运行：<code>openclaw gateway status</code></li>
              <li>• Agent 是否能收到 TASK.md：<code>cat ~/.openclaw/workspace-{id}/TASK.md</code></li>
              <li>• 查看 Gateway 日志：<code>openclaw logs --tail 100</code></li>
              <li>• 超时时间是否太短 — 增加 <code>timeoutMs</code> 值</li>
            </ul>
          </div>

          <div class="bg-surface rounded-lg p-4 border border-yellow-700/20">
            <div class="text-yellow-300 font-medium mb-2">💡 完全重新开始</div>
            <p class="text-gray-400">如果一切混乱，想从头来过：</p>
            ${codeBlock(`# 1. 清理已注册的 Uni
npx uni cleanup zhenhuan-palace

# 2. 重新部署
npx uni deploy universe.yaml

# 3. 验证
openclaw agents list
npx uni list`)}
          </div>

        </div>
      </div>

    </div>
  `;

  return renderLayout('用户手册', body, 'guide');
}

// ─── Uni Detail Page ──────────────────────────────

export interface UniDetailData {
  entry: UniRegistryEntry;
  config: UniverseConfig | null;
  workspaceStatus: Record<string, { hasSoul: boolean; hasTask: boolean; hasSubmission: boolean }>;
}

export function renderUniDetailPage(data: UniDetailData): string {
  const { entry, config, workspaceStatus } = data;

  const agentsTableHtml = config
    ? config.agents.map(agent => {
        const ws = workspaceStatus[agent.id] ?? { hasSoul: false, hasTask: false, hasSubmission: false };
        return `
          <tr class="border-b border-gray-700/30 hover:bg-surface-lighter/50 transition">
            <td class="py-3 px-4">
              <a href="/uni/${encodeURIComponent(entry.id)}/agent/${encodeURIComponent(agent.id)}" class="text-accent-light hover:underline font-medium">${escapeHtml(agent.id)}</a>
            </td>
            <td class="py-3 px-4 text-gray-300">${escapeHtml(agent.name)}</td>
            <td class="py-3 px-4 text-gray-400">${escapeHtml(agent.role.title)}</td>
            <td class="py-3 px-4 text-center">${agent.rank ?? '-'}</td>
            <td class="py-3 px-4 text-center">
              <span class="${ws.hasSoul ? 'text-green-400' : 'text-red-400'}">${ws.hasSoul ? '✓' : '✗'}</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span class="${ws.hasTask ? 'text-yellow-400' : 'text-gray-600'}">${ws.hasTask ? '⏳' : '—'}</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span class="${ws.hasSubmission ? 'text-blue-400' : 'text-gray-600'}">${ws.hasSubmission ? '📝' : '—'}</span>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="7" class="py-8 text-center text-gray-500">无法加载 Universe 配置</td></tr>';

  // Relationship type mappings for broader coverage
  const typeEmoji: Record<string, string> = {
    superior: '👆', subordinate: '👇', peer: '🤝', competitive: '⚔️',
    reviewer: '🔍', advisor: '💡', ally: '🛡️', rival: '⚔️',
    mentor: '🎓', delegate: '📋', supervises: '👆', collaborates: '🤝',
    competes: '⚔️', advises: '💡', audits: '🔍',
  };

  const relationshipsHtml = config && config.relationships.length > 0
    ? `<div class="bg-surface-light rounded-xl p-6 border border-gray-700/50 mt-6">
        <h2 class="text-lg font-semibold text-white mb-4">🔗 关系图谱</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${config.relationships.map(rel => `
              <div class="bg-surface rounded-lg p-3 border border-gray-700/30 flex items-center gap-3">
                <span class="text-lg">${typeEmoji[rel.type] ?? '↔'}</span>
                <div class="text-sm">
                  <a href="/uni/${encodeURIComponent(entry.id)}/agent/${encodeURIComponent(rel.from)}" class="text-accent-light hover:underline">${escapeHtml(rel.from)}</a>
                  <span class="text-gray-500 mx-1">${rel.type}</span>
                  <a href="/uni/${encodeURIComponent(entry.id)}/agent/${encodeURIComponent(rel.to)}" class="text-accent-light hover:underline">${escapeHtml(rel.to)}</a>
                  ${rel.weight !== undefined ? `<span class="text-gray-600 ml-1">(${rel.weight})</span>` : ''}
                </div>
              </div>`).join('')}
        </div>
      </div>`
    : '';

  const body = `
    <div class="mb-6">
      <a href="/" class="text-gray-500 hover:text-gray-300 text-sm transition">← 返回首页</a>
    </div>

    <div class="flex items-start justify-between mb-6">
      <div>
        <h1 class="text-3xl font-bold text-white mb-1">${escapeHtml(entry.id)}</h1>
        <p class="text-gray-400">${escapeHtml(entry.description)}</p>
      </div>
      <div class="flex gap-3">
        <button onclick="uniAction('reset', '${entry.id}')" class="px-4 py-2 bg-yellow-600/20 text-yellow-300 rounded-lg hover:bg-yellow-600/30 transition text-sm">🔄 重置</button>
        <button onclick="uniAction('cleanup', '${entry.id}')" class="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg hover:bg-red-600/30 transition text-sm">🗑️ 清理</button>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-surface-light rounded-xl p-4 border border-gray-700/50">
        <div class="text-sm text-gray-400">类型</div>
        <div class="text-white font-medium mt-1">${entry.type}</div>
      </div>
      <div class="bg-surface-light rounded-xl p-4 border border-gray-700/50">
        <div class="text-sm text-gray-400">版本</div>
        <div class="text-white font-medium mt-1">v${escapeHtml(entry.version)}</div>
      </div>
      <div class="bg-surface-light rounded-xl p-4 border border-gray-700/50">
        <div class="text-sm text-gray-400">Agent 数</div>
        <div class="text-white font-medium mt-1">${entry.agentIds.length}</div>
      </div>
      <div class="bg-surface-light rounded-xl p-4 border border-gray-700/50">
        <div class="text-sm text-gray-400">部署时间</div>
        <div class="text-white font-medium mt-1">${formatDate(entry.deployedAt)}</div>
      </div>
    </div>

    <!-- Agent Table -->
    <div class="bg-surface-light rounded-xl border border-gray-700/50 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-700/50">
        <h2 class="text-lg font-semibold text-white">🤖 Agents</h2>
      </div>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-500 text-left border-b border-gray-700/50">
            <th class="py-3 px-4 font-medium">ID</th>
            <th class="py-3 px-4 font-medium">名称</th>
            <th class="py-3 px-4 font-medium">角色</th>
            <th class="py-3 px-4 font-medium text-center">Rank</th>
            <th class="py-3 px-4 font-medium text-center">SOUL</th>
            <th class="py-3 px-4 font-medium text-center">TASK</th>
            <th class="py-3 px-4 font-medium text-center">SUB</th>
          </tr>
        </thead>
        <tbody>
          ${agentsTableHtml}
        </tbody>
      </table>
    </div>

    ${relationshipsHtml}

    <div class="mt-6 bg-surface-light rounded-xl p-4 border border-gray-700/50">
      <div class="text-sm text-gray-400">Spec 路径</div>
      <code class="text-accent-light text-sm">${escapeHtml(entry.specPath)}</code>
    </div>

    <script>
      async function uniAction(action, id) {
        if (action === 'cleanup' && !confirm('确定要清理此 Uni？所有 workspace 和 agent 目录将被删除。')) return;
        if (action === 'reset' && !confirm('确定要重置此 Uni？运行时数据（sessions/TASK.md/SUBMISSION.md）将被清除。')) return;
        const res = await fetch('/api/unis/' + encodeURIComponent(id) + '/' + action, { method: 'POST' });
        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
        if (action === 'cleanup') window.location.href = '/';
        else window.location.reload();
      }
    </script>
  `;

  return renderLayout(entry.id, body);
}

// ─── Agent Detail Page ────────────────────────────

export interface AgentDetailData {
  uniId: string;
  agentId: string;
  config: UniverseConfig | null;
  workspace: { hasSoul: boolean; hasTask: boolean; hasSubmission: boolean };
}

export function renderAgentDetailPage(data: AgentDetailData): string {
  const { uniId, agentId, config, workspace } = data;
  const agent = config?.agents.find(a => a.id === agentId);

  if (!agent) {
    return renderLayout('Agent Not Found', `
      <div class="text-center py-20">
        <div class="text-6xl mb-4">❓</div>
        <h2 class="text-xl text-gray-400">Agent "${escapeHtml(agentId)}" 未找到</h2>
        <a href="/uni/${encodeURIComponent(uniId)}" class="text-accent-light hover:underline mt-4 block">返回 Uni</a>
      </div>
    `);
  }

  const relationships = config?.relationships.filter(
    r => r.from === agentId || r.to === agentId
  ) ?? [];

  const traitsHtml = agent.traits
    ? Object.entries(agent.traits).map(([key, val]) => `
        <div class="flex items-center justify-between py-2 border-b border-gray-700/30">
          <span class="text-gray-400">${escapeHtml(key)}</span>
          <div class="flex items-center gap-2">
            <div class="w-24 bg-surface rounded-full h-2">
              <div class="bg-accent rounded-full h-2" style="width: ${Math.min(100, (val as number))}%"></div>
            </div>
            <span class="text-white text-sm w-8 text-right">${val}</span>
          </div>
        </div>
      `).join('')
    : '<p class="text-gray-500">无特征数据</p>';

  const relsHtml = relationships.length > 0
    ? relationships.map(rel => {
        const other = rel.from === agentId ? rel.to : rel.from;
        const direction = rel.from === agentId ? '→' : '←';
        return `
          <div class="flex items-center gap-3 py-2 border-b border-gray-700/30">
            <span class="text-gray-400">${direction}</span>
            <a href="/uni/${encodeURIComponent(uniId)}/agent/${encodeURIComponent(other)}" class="text-accent-light hover:underline">${escapeHtml(other)}</a>
            <span class="badge bg-gray-700 text-gray-300">${rel.type}</span>
            ${rel.weight !== undefined ? `<span class="text-gray-500 text-sm">(${rel.weight})</span>` : ''}
          </div>`;
      }).join('')
    : '<p class="text-gray-500">无关系数据</p>';

  const body = `
    <div class="mb-6">
      <a href="/uni/${encodeURIComponent(uniId)}" class="text-gray-500 hover:text-gray-300 text-sm transition">← 返回 ${escapeHtml(uniId)}</a>
    </div>

    <h1 class="text-3xl font-bold text-white mb-1">${escapeHtml(agent.name)}</h1>
    <p class="text-gray-400 mb-6">${escapeHtml(agent.role.title)} · Rank ${agent.rank ?? 'N/A'}</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left column -->
      <div class="space-y-6">
        <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-lg font-semibold text-white mb-4">📋 职责</h2>
          ${agent.role.duties.length > 0
            ? `<ul class="space-y-2">${agent.role.duties.map(d => `<li class="text-gray-300 text-sm flex gap-2"><span class="text-gray-500">•</span>${escapeHtml(d)}</li>`).join('')}</ul>`
            : '<p class="text-gray-500">无职责定义</p>'}
        </div>

        <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-lg font-semibold text-white mb-4">🔐 权限</h2>
          ${agent.role.permissions.length > 0
            ? `<div class="flex flex-wrap gap-2">${agent.role.permissions.map(p => `<span class="badge bg-accent/20 text-accent-light">${escapeHtml(p)}</span>`).join('')}</div>`
            : '<p class="text-gray-500">无权限定义</p>'}
        </div>

        ${agent.capabilities ? `
          <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
            <h2 class="text-lg font-semibold text-white mb-4">⚡ 能力</h2>
            <div class="flex flex-wrap gap-2">
              ${agent.capabilities.map(c => `<span class="badge bg-green-500/20 text-green-300">${escapeHtml(c)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-lg font-semibold text-white mb-4">📊 特征值</h2>
          ${traitsHtml}
        </div>

        <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-lg font-semibold text-white mb-4">🔗 关系</h2>
          ${relsHtml}
        </div>

        <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50">
          <h2 class="text-lg font-semibold text-white mb-4">📂 Workspace 状态</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-400">SOUL.md</span><span class="${workspace.hasSoul ? 'text-green-400' : 'text-red-400'}">${workspace.hasSoul ? '✓ 存在' : '✗ 缺失'}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">TASK.md</span><span class="${workspace.hasTask ? 'text-yellow-400' : 'text-gray-600'}">${workspace.hasTask ? '⏳ 有任务' : '— 空闲'}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">SUBMISSION.md</span><span class="${workspace.hasSubmission ? 'text-blue-400' : 'text-gray-600'}">${workspace.hasSubmission ? '📝 已提交' : '— 无'}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  return renderLayout(`${agent.name} — ${uniId}`, body);
}

// ─── Manage Page ──────────────────────────────────

export function renderManagePage(unis: UniRegistryEntry[], healthStatus: {
  openclawDir: string;
  configExists: boolean;
  registryExists: boolean;
  totalAgentsInConfig: number;
}): string {
  const body = `
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">管理中心</h1>
      <p class="text-gray-400">Uni 生命周期管理与健康检查</p>
    </div>

    <!-- Health Check -->
    <div class="bg-surface-light rounded-xl p-6 border border-gray-700/50 mb-8">
      <h2 class="text-lg font-semibold text-white mb-4">🏥 健康状态</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-gray-400">OpenClaw 目录</div>
          <code class="text-accent-light text-xs">${escapeHtml(healthStatus.openclawDir)}</code>
        </div>
        <div>
          <div class="text-gray-400">openclaw.json</div>
          <span class="${healthStatus.configExists ? 'text-green-400' : 'text-red-400'}">${healthStatus.configExists ? '✓ 正常' : '✗ 缺失'}</span>
        </div>
        <div>
          <div class="text-gray-400">uni-registry.json</div>
          <span class="${healthStatus.registryExists ? 'text-green-400' : 'text-red-400'}">${healthStatus.registryExists ? '✓ 正常' : '✗ 缺失'}</span>
        </div>
        <div>
          <div class="text-gray-400">Config 中 Agent 数</div>
          <span class="text-white">${healthStatus.totalAgentsInConfig}</span>
        </div>
      </div>
    </div>

    <!-- Uni List -->
    <div class="bg-surface-light rounded-xl border border-gray-700/50 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-700/50 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-white">🌌 所有 Uni</h2>
        <span class="text-gray-500 text-sm">${unis.length} 个</span>
      </div>
      ${unis.length === 0
        ? '<div class="py-12 text-center text-gray-500">暂无已注册的 Uni</div>'
        : `<table class="w-full text-sm">
            <thead>
              <tr class="text-gray-500 text-left border-b border-gray-700/50">
                <th class="py-3 px-4 font-medium">ID</th>
                <th class="py-3 px-4 font-medium">类型</th>
                <th class="py-3 px-4 font-medium text-center">Agents</th>
                <th class="py-3 px-4 font-medium">版本</th>
                <th class="py-3 px-4 font-medium">最后更新</th>
                <th class="py-3 px-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              ${unis.map(uni => `
                <tr class="border-b border-gray-700/30 hover:bg-surface-lighter/50">
                  <td class="py-3 px-4">
                    <a href="/uni/${encodeURIComponent(uni.id)}" class="text-accent-light hover:underline">${escapeHtml(uni.id)}</a>
                  </td>
                  <td class="py-3 px-4 text-gray-400">${uni.type}</td>
                  <td class="py-3 px-4 text-center text-gray-300">${uni.agentIds.length}</td>
                  <td class="py-3 px-4 text-gray-400">v${escapeHtml(uni.version)}</td>
                  <td class="py-3 px-4 text-gray-500">${formatDate(uni.updatedAt)}</td>
                  <td class="py-3 px-4 text-right">
                    <button onclick="uniAction('reset', '${uni.id}')" class="text-yellow-400 hover:text-yellow-300 mr-3" title="重置">🔄</button>
                    <button onclick="uniAction('cleanup', '${uni.id}')" class="text-red-400 hover:text-red-300" title="清理">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`
      }
    </div>

    <script>
      async function uniAction(action, id) {
        if (action === 'cleanup' && !confirm('确定要清理 ' + id + '？所有 workspace 和 agent 目录将被删除。')) return;
        if (action === 'reset' && !confirm('确定要重置 ' + id + '？运行时数据将被清除。')) return;
        const res = await fetch('/api/unis/' + encodeURIComponent(id) + '/' + action, { method: 'POST' });
        const data = await res.json();
        alert(JSON.stringify(data, null, 2));
        window.location.reload();
      }
    </script>
  `;

  return renderLayout('管理中心', body, 'manage');
}

// ─── Utilities ────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}
