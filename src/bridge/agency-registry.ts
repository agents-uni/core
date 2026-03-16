/**
 * Agency-Agents Registry
 *
 * 管理 agency-agents 仓库的本地生命周期：
 * - init:   克隆到 ~/.agents-uni/agency-agents/
 * - update: git pull 拉取最新
 * - list:   列出所有可用分类及 agent 数量
 * - resolve: 将分类名转为目录路径
 *
 * 让用户无需手动 clone 和管理路径。
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';

// ─── Constants ───────────────────────────────

const AGENCY_REPO_URL = 'https://github.com/msitarzewski/agency-agents.git';
const AGENTS_UNI_HOME = join(homedir(), '.agents-uni');
const AGENCY_DIR = join(AGENTS_UNI_HOME, 'agency-agents');

/**
 * Categories that contain actual agent .md files
 * (excludes examples, integrations, scripts)
 */
const AGENT_CATEGORIES = [
  'academic',
  'design',
  'engineering',
  'game-development',
  'marketing',
  'paid-media',
  'product',
  'project-management',
  'sales',
  'spatial-computing',
  'specialized',
  'strategy',
  'support',
  'testing',
] as const;

export type AgencyCategory = typeof AGENT_CATEGORIES[number];

// ─── Types ───────────────────────────────────

export interface AgencyCategoryInfo {
  /** Category name (directory name) */
  name: string;
  /** Number of agent .md files */
  agentCount: number;
  /** Absolute path to the category directory */
  path: string;
}

export interface AgencyStatus {
  /** Whether agency-agents is installed locally */
  installed: boolean;
  /** Local directory path */
  dir: string;
  /** Current git commit hash (short) */
  commit?: string;
  /** Last update time (from git log) */
  lastUpdated?: string;
  /** Total agent count across all categories */
  totalAgents?: number;
  /** Category breakdown */
  categories?: AgencyCategoryInfo[];
}

export interface AgencyUpdateResult {
  /** Whether new commits were pulled */
  updated: boolean;
  /** Previous commit hash */
  oldCommit: string;
  /** New commit hash */
  newCommit: string;
  /** Summary of changes (git log --oneline) */
  changelog: string[];
}

// ─── Core Functions ──────────────────────────

/**
 * Get the local agency-agents directory path
 */
export function getAgencyDir(): string {
  return AGENCY_DIR;
}

/**
 * Check if agency-agents is installed locally
 */
export function isAgencyInstalled(): boolean {
  return existsSync(join(AGENCY_DIR, '.git'));
}

/**
 * Clone agency-agents repo to ~/.agents-uni/agency-agents/
 *
 * @param shallow - Use shallow clone (--depth 1) for faster download. Default: true
 * @throws If git is not available or clone fails
 */
export function agencyInit(shallow = true): void {
  if (isAgencyInstalled()) {
    throw new Error(
      `agency-agents is already installed at ${AGENCY_DIR}. Use agencyUpdate() to pull latest.`
    );
  }

  // Ensure parent directory exists
  mkdirSync(AGENTS_UNI_HOME, { recursive: true });

  const depthFlag = shallow ? '--depth 1' : '';
  execSync(`git clone ${depthFlag} ${AGENCY_REPO_URL} "${AGENCY_DIR}"`, {
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  // Write metadata
  writeAgencyMeta({ installedAt: new Date().toISOString() });
}

/**
 * Pull latest changes from agency-agents repo
 *
 * @returns Update result with old/new commit hashes and changelog
 * @throws If not installed or git pull fails
 */
export function agencyUpdate(): AgencyUpdateResult {
  if (!isAgencyInstalled()) {
    throw new Error(
      'agency-agents is not installed. Run `uni agency init` first.'
    );
  }

  const oldCommit = getGitCommit();

  // For shallow clones, unshallow first to enable proper pull
  try {
    const isShallow = existsSync(join(AGENCY_DIR, '.git', 'shallow'));
    if (isShallow) {
      execSync('git fetch --unshallow', { cwd: AGENCY_DIR, stdio: 'pipe' });
    }
  } catch {
    // Already unshallowed or not applicable, continue
  }

  execSync('git pull origin main', {
    cwd: AGENCY_DIR,
    stdio: 'pipe',
    encoding: 'utf-8',
  });

  const newCommit = getGitCommit();

  // Get changelog between old and new
  let changelog: string[] = [];
  if (oldCommit !== newCommit) {
    try {
      const log = execSync(
        `git log --oneline ${oldCommit}..${newCommit}`,
        { cwd: AGENCY_DIR, stdio: 'pipe', encoding: 'utf-8' }
      ).trim();
      changelog = log ? log.split('\n') : [];
    } catch {
      changelog = ['(unable to retrieve changelog)'];
    }
  }

  // Update metadata
  writeAgencyMeta({
    ...readAgencyMeta(),
    lastUpdatedAt: new Date().toISOString(),
  });

  return {
    updated: oldCommit !== newCommit,
    oldCommit,
    newCommit,
    changelog,
  };
}

/**
 * List all available agent categories with agent counts
 */
export function agencyListCategories(): AgencyCategoryInfo[] {
  if (!isAgencyInstalled()) {
    throw new Error(
      'agency-agents is not installed. Run `uni agency init` first.'
    );
  }

  const categories: AgencyCategoryInfo[] = [];

  for (const cat of AGENT_CATEGORIES) {
    const catDir = join(AGENCY_DIR, cat);
    if (!existsSync(catDir)) continue;

    const files = readdirSync(catDir).filter(
      (f) => f.endsWith('.md') && !f.startsWith('README')
    );

    // Count only files with valid frontmatter (actual agents)
    let agentCount = 0;
    for (const file of files) {
      try {
        const content = readFileSync(join(catDir, file), 'utf-8');
        if (content.startsWith('---\n')) {
          agentCount++;
        }
      } catch {
        // Skip unreadable files
      }
    }

    categories.push({
      name: cat,
      agentCount,
      path: catDir,
    });
  }

  return categories;
}

/**
 * Get full status of the local agency-agents installation
 */
export function agencyStatus(): AgencyStatus {
  const installed = isAgencyInstalled();

  if (!installed) {
    return { installed, dir: AGENCY_DIR };
  }

  const commit = getGitCommit();
  const lastUpdated = getGitLastDate();
  const categories = agencyListCategories();
  const totalAgents = categories.reduce((sum, c) => sum + c.agentCount, 0);

  return {
    installed,
    dir: AGENCY_DIR,
    commit,
    lastUpdated,
    totalAgents,
    categories,
  };
}

/**
 * Resolve category names to absolute directory paths
 *
 * @param categories - Category names (e.g., ['engineering', 'design']) or ['all']
 * @returns Array of absolute directory paths
 * @throws If agency-agents is not installed or a category doesn't exist
 */
export function resolveAgencyCategories(categories: string[]): string[] {
  if (!isAgencyInstalled()) {
    throw new Error(
      'agency-agents is not installed. Run `uni agency init` first.'
    );
  }

  // Handle --all / 'all'
  if (categories.length === 1 && categories[0] === 'all') {
    return AGENT_CATEGORIES
      .map((cat) => join(AGENCY_DIR, cat))
      .filter((p) => existsSync(p));
  }

  const paths: string[] = [];
  for (const cat of categories) {
    const catDir = join(AGENCY_DIR, cat);
    if (!existsSync(catDir)) {
      throw new Error(
        `Category "${cat}" not found. Available: ${AGENT_CATEGORIES.join(', ')}`
      );
    }
    paths.push(catDir);
  }

  return paths;
}

/**
 * Get list of valid category names
 */
export function getAvailableCategories(): readonly string[] {
  return AGENT_CATEGORIES;
}

// ─── Internal Helpers ────────────────────────

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: AGENCY_DIR,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

function getGitLastDate(): string {
  try {
    return execSync('git log -1 --format=%ci', {
      cwd: AGENCY_DIR,
      stdio: 'pipe',
      encoding: 'utf-8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

interface AgencyMeta {
  installedAt?: string;
  lastUpdatedAt?: string;
}

function readAgencyMeta(): AgencyMeta {
  const metaPath = join(AGENTS_UNI_HOME, 'agency-meta.json');
  try {
    return JSON.parse(readFileSync(metaPath, 'utf-8'));
  } catch {
    return {};
  }
}

function writeAgencyMeta(meta: AgencyMeta): void {
  const metaPath = join(AGENTS_UNI_HOME, 'agency-meta.json');
  mkdirSync(AGENTS_UNI_HOME, { recursive: true });
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
}
