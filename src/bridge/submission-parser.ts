/**
 * Submission Parser — NLP-style post-extraction from free-form agent submissions.
 *
 * Design principle: agents write freely, the system extracts signals after the fact.
 * No YAML frontmatter, no rigid structure — just natural language with optional
 * soft conventions (e.g. `> confidence: 0.8` at the end).
 *
 * Extracted signals: confidence, stance, mentioned agents, referenced files,
 * and reasoning summary.
 */

// ─── Types ──────────────────────────────────────

export interface ParsedSubmission {
  /** Original submission text, untouched */
  raw: string;
  /** Content with soft convention lines stripped */
  content: string;
  /** 0-1 confidence score inferred from tone or soft convention */
  confidence?: number;
  /** Agent's stance on the topic */
  stance?: 'support' | 'oppose' | 'neutral' | 'mixed';
  /** Agent IDs mentioned via @name or known-agent matching */
  mentionedAgents: string[];
  /** File paths found in the text */
  referencedFiles: string[];
  /** One-line summary of reasoning structure (numbered lists / headings) */
  reasoningSummary?: string;
}

// ─── Confidence ─────────────────────────────────

const CONFIDENCE_HIGH: [RegExp, number][] = [
  [/显然/g, 0.9],
  [/毫无疑问/g, 0.95],
  [/\bclearly\b/gi, 0.85],
  [/\bdefinitely\b/gi, 0.9],
  [/\bcertainly\b/gi, 0.88],
  [/\bI'?m certain\b/gi, 0.9],
  [/\bwithout doubt\b/gi, 0.92],
];

const CONFIDENCE_MID: [RegExp, number][] = [
  [/我认为/g, 0.6],
  [/\bI think\b/gi, 0.6],
  [/\bI believe\b/gi, 0.65],
  [/应该/g, 0.6],
  [/\bseems like\b/gi, 0.55],
  [/\blikely\b/gi, 0.6],
];

const CONFIDENCE_LOW: [RegExp, number][] = [
  [/可能/g, 0.3],
  [/也许/g, 0.25],
  [/\bperhaps\b/gi, 0.3],
  [/\bmight\b/gi, 0.35],
  [/\bnot sure\b/gi, 0.25],
  [/不确定/g, 0.25],
  [/\bunclear\b/gi, 0.3],
];

/** Soft convention: `> confidence: 0.8` at end of text */
const SOFT_CONFIDENCE_RE = /^>\s*confidence:\s*([\d.]+)\s*$/m;

function extractConfidence(text: string): { confidence?: number; strippedText: string } {
  // Path B: soft convention takes priority
  const match = SOFT_CONFIDENCE_RE.exec(text);
  if (match) {
    const val = parseFloat(match[1]);
    if (val >= 0 && val <= 1) {
      const strippedText = text.replace(match[0], '').trimEnd();
      return { confidence: val, strippedText };
    }
  }

  // Path A: NLP scan
  const hits: { tier: 'high' | 'mid' | 'low'; value: number }[] = [];

  for (const [re, val] of CONFIDENCE_HIGH) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push({ tier: 'high', value: val });
  }
  for (const [re, val] of CONFIDENCE_MID) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push({ tier: 'mid', value: val });
  }
  for (const [re, val] of CONFIDENCE_LOW) {
    re.lastIndex = 0;
    if (re.test(text)) hits.push({ tier: 'low', value: val });
  }

  if (hits.length === 0) return { confidence: undefined, strippedText: text };

  const avg = hits.reduce((sum, h) => sum + h.value, 0) / hits.length;
  return { confidence: Math.round(avg * 100) / 100, strippedText: text };
}

// ─── Stance ─────────────────────────────────────

const SUPPORT_RE =
  /同意|赞成|支持|没错|\bagree\b|\bendorse\b|\bgood idea\b|\+1/gi;
const OPPOSE_RE =
  /反对|不同意|\bdisagree\b|不可行|\bshouldn'?t\b|\bI disagree\b/gi;

function extractStance(text: string): ParsedSubmission['stance'] {
  SUPPORT_RE.lastIndex = 0;
  OPPOSE_RE.lastIndex = 0;
  const hasSupport = SUPPORT_RE.test(text);
  OPPOSE_RE.lastIndex = 0;
  const hasOppose = OPPOSE_RE.test(text);

  if (hasSupport && hasOppose) return 'mixed';
  if (hasSupport) return 'support';
  if (hasOppose) return 'oppose';
  return 'neutral';
}

// ─── Mentioned Agents ───────────────────────────

const AT_MENTION_RE = /@([\w-]+)/g;

function extractMentionedAgents(text: string, knownAgents: string[]): string[] {
  const found = new Set<string>();

  // @mentions
  let m;
  AT_MENTION_RE.lastIndex = 0;
  while ((m = AT_MENTION_RE.exec(text)) !== null) {
    found.add(m[1]);
  }

  // Known agent name matching (case-insensitive whole word)
  for (const agent of knownAgents) {
    const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'i');
    if (re.test(text)) found.add(agent);
  }

  return [...found];
}

// ─── Referenced Files ───────────────────────────

const BACKTICK_PATH_RE = /`([./][\w./-]+\.\w+)`/g;
const BARE_PATH_RE = /(?:^|\s)((?:\.\/|src\/|lib\/|tests?\/|packages?\/)[\w./-]+\.\w+)/gm;

function extractReferencedFiles(text: string): string[] {
  const found = new Set<string>();

  let m;
  BACKTICK_PATH_RE.lastIndex = 0;
  while ((m = BACKTICK_PATH_RE.exec(text)) !== null) {
    found.add(m[1]);
  }
  BARE_PATH_RE.lastIndex = 0;
  while ((m = BARE_PATH_RE.exec(text)) !== null) {
    found.add(m[1]);
  }

  return [...found];
}

// ─── Reasoning Summary ──────────────────────────

const NUMBERED_LIST_RE = /^\d+\.\s+(.+)$/gm;
const HEADING_RE = /^#{1,3}\s+(.+)$/gm;

function extractReasoningSummary(text: string): string | undefined {
  // Try numbered list first
  const numbered: string[] = [];
  let m;
  NUMBERED_LIST_RE.lastIndex = 0;
  while ((m = NUMBERED_LIST_RE.exec(text)) !== null) {
    numbered.push(m[1].trim());
  }
  if (numbered.length >= 2) {
    return numbered.join(' → ');
  }

  // Try headings
  const headings: string[] = [];
  HEADING_RE.lastIndex = 0;
  while ((m = HEADING_RE.exec(text)) !== null) {
    headings.push(m[1].trim());
  }
  if (headings.length >= 2) {
    return headings.join(' → ');
  }

  return undefined;
}

// ─── Main Export ────────────────────────────────

/**
 * Parse a raw SUBMISSION.md into structured signals.
 *
 * Pure function, no side effects. Agents write freely;
 * this function extracts what it can after the fact.
 */
export function parseSubmissionContent(
  raw: string,
  knownAgents: string[] = []
): ParsedSubmission {
  const trimmed = raw.trim();
  const { confidence, strippedText } = extractConfidence(trimmed);

  return {
    raw: trimmed,
    content: strippedText.trim(),
    confidence,
    stance: extractStance(trimmed),
    mentionedAgents: extractMentionedAgents(trimmed, knownAgents),
    referencedFiles: extractReferencedFiles(trimmed),
    reasoningSummary: extractReasoningSummary(trimmed),
  };
}
