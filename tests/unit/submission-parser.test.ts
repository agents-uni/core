import { describe, it, expect } from 'vitest';
import { parseSubmissionContent } from '../../src/bridge/submission-parser.js';

describe('parseSubmissionContent', () => {
  describe('basic parsing', () => {
    it('should preserve raw text and trim content', () => {
      const result = parseSubmissionContent('  Hello world  ');
      expect(result.raw).toBe('Hello world');
      expect(result.content).toBe('Hello world');
    });

    it('should handle empty input', () => {
      const result = parseSubmissionContent('');
      expect(result.raw).toBe('');
      expect(result.content).toBe('');
      expect(result.mentionedAgents).toEqual([]);
      expect(result.referencedFiles).toEqual([]);
    });
  });

  describe('confidence — soft convention (path B)', () => {
    it('should extract confidence from soft convention line', () => {
      const result = parseSubmissionContent(
        'I think this is correct.\n\n> confidence: 0.8'
      );
      expect(result.confidence).toBe(0.8);
      expect(result.content).not.toContain('> confidence');
    });

    it('should strip the soft convention line from content', () => {
      const result = parseSubmissionContent(
        'My analysis.\n> confidence: 0.75'
      );
      expect(result.content).toBe('My analysis.');
    });

    it('should ignore out-of-range confidence values', () => {
      const result = parseSubmissionContent(
        'Text.\n> confidence: 1.5'
      );
      // Falls back to NLP path since 1.5 > 1
      expect(result.content).toContain('> confidence: 1.5');
    });
  });

  describe('confidence — NLP (path A)', () => {
    it('should detect high confidence phrases', () => {
      const result = parseSubmissionContent('This is clearly the right approach.');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should detect mid confidence phrases', () => {
      const result = parseSubmissionContent('I think this approach is reasonable.');
      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should detect low confidence phrases', () => {
      const result = parseSubmissionContent('Perhaps this might work, not sure.');
      expect(result.confidence).toBeLessThanOrEqual(0.35);
    });

    it('should average across multiple tiers', () => {
      const result = parseSubmissionContent(
        'I think this is correct, but perhaps there are edge cases.'
      );
      expect(result.confidence).toBeDefined();
      // Mix of mid ("I think") and low ("perhaps") → somewhere in between
      expect(result.confidence!).toBeGreaterThan(0.25);
      expect(result.confidence!).toBeLessThan(0.7);
    });

    it('should return undefined confidence when no signals found', () => {
      const result = parseSubmissionContent('The sky is blue.');
      expect(result.confidence).toBeUndefined();
    });

    it('should detect Chinese high confidence', () => {
      const result = parseSubmissionContent('显然这是最优解。');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should detect Chinese low confidence', () => {
      const result = parseSubmissionContent('也许可以试试这个方案。');
      expect(result.confidence).toBeLessThanOrEqual(0.3);
    });
  });

  describe('stance', () => {
    it('should detect support', () => {
      const result = parseSubmissionContent('I agree with the proposal.');
      expect(result.stance).toBe('support');
    });

    it('should detect oppose', () => {
      const result = parseSubmissionContent('I disagree with this approach.');
      expect(result.stance).toBe('oppose');
    });

    it('should detect mixed stance', () => {
      const result = parseSubmissionContent(
        'I agree on the goals, but I disagree with the implementation.'
      );
      expect(result.stance).toBe('mixed');
    });

    it('should default to neutral', () => {
      const result = parseSubmissionContent('The weather is nice today.');
      expect(result.stance).toBe('neutral');
    });

    it('should detect Chinese support keywords', () => {
      const result = parseSubmissionContent('我赞成这个方案。');
      expect(result.stance).toBe('support');
    });

    it('should detect Chinese oppose keywords', () => {
      const result = parseSubmissionContent('这个方案不可行。');
      expect(result.stance).toBe('oppose');
    });
  });

  describe('mentionedAgents', () => {
    it('should extract @mentions', () => {
      const result = parseSubmissionContent(
        'As @alice pointed out, @bob had a good idea.'
      );
      expect(result.mentionedAgents).toContain('alice');
      expect(result.mentionedAgents).toContain('bob');
    });

    it('should match known agent names case-insensitively', () => {
      const result = parseSubmissionContent(
        'I agree with ZhenHuan on this point.',
        ['zhenhuan', 'huafei']
      );
      expect(result.mentionedAgents).toContain('zhenhuan');
      expect(result.mentionedAgents).not.toContain('huafei');
    });

    it('should deduplicate @mention and known agent match', () => {
      const result = parseSubmissionContent(
        '@alice said something. alice agrees.',
        ['alice']
      );
      expect(result.mentionedAgents.filter(a => a === 'alice')).toHaveLength(1);
    });

    it('should return empty array when no agents mentioned', () => {
      const result = parseSubmissionContent('No mentions here.');
      expect(result.mentionedAgents).toEqual([]);
    });
  });

  describe('referencedFiles', () => {
    it('should extract backtick-wrapped file paths', () => {
      const result = parseSubmissionContent(
        'See `./src/main.ts` and `./lib/utils.js` for details.'
      );
      expect(result.referencedFiles).toContain('./src/main.ts');
      expect(result.referencedFiles).toContain('./lib/utils.js');
    });

    it('should extract bare src/ paths', () => {
      const result = parseSubmissionContent(
        'Check src/bridge/workspace-io.ts for the implementation.'
      );
      expect(result.referencedFiles).toContain('src/bridge/workspace-io.ts');
    });

    it('should extract test/ paths', () => {
      const result = parseSubmissionContent(
        'The tests/unit/parser.test.ts file covers this.'
      );
      expect(result.referencedFiles).toContain('tests/unit/parser.test.ts');
    });

    it('should deduplicate paths', () => {
      const result = parseSubmissionContent(
        'See `./src/main.ts` and also ./src/main.ts again.'
      );
      expect(result.referencedFiles.filter(f => f === './src/main.ts')).toHaveLength(1);
    });

    it('should return empty array when no paths found', () => {
      const result = parseSubmissionContent('No file references here.');
      expect(result.referencedFiles).toEqual([]);
    });
  });

  describe('reasoningSummary', () => {
    it('should summarize numbered list', () => {
      const result = parseSubmissionContent(
        '1. Analyze the problem\n2. Propose solution\n3. Validate approach'
      );
      expect(result.reasoningSummary).toBe(
        'Analyze the problem → Propose solution → Validate approach'
      );
    });

    it('should summarize markdown headings', () => {
      const result = parseSubmissionContent(
        '## Analysis\nSome text.\n## Proposal\nMore text.\n## Conclusion\nFinal.'
      );
      expect(result.reasoningSummary).toBe('Analysis → Proposal → Conclusion');
    });

    it('should prefer numbered list over headings', () => {
      const result = parseSubmissionContent(
        '## Overview\n1. Step one\n2. Step two\n## End'
      );
      expect(result.reasoningSummary).toBe('Step one → Step two');
    });

    it('should return undefined for unstructured text', () => {
      const result = parseSubmissionContent('Just a single paragraph of text.');
      expect(result.reasoningSummary).toBeUndefined();
    });

    it('should ignore a single numbered item', () => {
      const result = parseSubmissionContent('1. Only one item.');
      expect(result.reasoningSummary).toBeUndefined();
    });
  });

  describe('integration', () => {
    it('should parse a complete submission with all signals', () => {
      const raw = `## 分析
我认为 @alice 的方案是可行的。

1. 检查 \`./src/main.ts\` 中的实现
2. 验证与 src/bridge/workspace-io.ts 的兼容性
3. 确认没有边界情况

我支持这个方案，但也许需要更多测试。

> confidence: 0.7`;

      const result = parseSubmissionContent(raw, ['alice', 'bob']);

      expect(result.confidence).toBe(0.7);
      expect(result.stance).toBe('support');
      expect(result.mentionedAgents).toContain('alice');
      expect(result.referencedFiles).toContain('./src/main.ts');
      expect(result.referencedFiles).toContain('src/bridge/workspace-io.ts');
      expect(result.reasoningSummary).toContain('→');
      expect(result.content).not.toContain('> confidence');
    });
  });
});
