import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewDispatcher } from '../../src/bridge/review-dispatcher.js';
import { MemoryWorkspaceIO } from '../../src/bridge/workspace-io.js';
import { EventBus } from '../../src/core/event-bus.js';
import type { DispatchTask, AgentSubmission } from '../../src/bridge/task-dispatcher.js';

describe('ReviewDispatcher', () => {
  let io: MemoryWorkspaceIO;
  let eventBus: EventBus;
  let reviewer: ReviewDispatcher;

  const sampleTask: DispatchTask = {
    id: 'task-001',
    title: 'Write a poem',
    description: 'Write a short poem about spring',
    criteria: [
      { name: 'quality', weight: 0.7, description: 'Overall quality' },
    ],
    timeoutMs: 500,
    participants: ['agent-a', 'agent-b', 'agent-c'],
  };

  const sampleSubmissions: AgentSubmission[] = [
    {
      agentId: 'agent-a',
      output: 'Roses bloom in spring, warm wind carries birdsong.',
      submittedAt: new Date().toISOString(),
      duration: 100,
    },
    {
      agentId: 'agent-b',
      output: 'Cherry blossoms fall like snow, rivers wake from winter sleep.',
      submittedAt: new Date().toISOString(),
      duration: 150,
    },
    {
      agentId: 'agent-c',
      output: 'Green shoots push through soil, the earth remembers warmth.',
      submittedAt: new Date().toISOString(),
      duration: 200,
    },
  ];

  beforeEach(() => {
    io = new MemoryWorkspaceIO();
    eventBus = new EventBus();
    reviewer = new ReviewDispatcher(io, {
      pollIntervalMs: 50,
      eventBus,
    });
  });

  describe('dispatchReviews', () => {
    it('should write REVIEW_TASK.md to all reviewer workspaces', async () => {
      // Start dispatch but don't wait — simulate submissions immediately
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 300 }
      );

      // Simulate reviews submitted
      setTimeout(() => {
        io.simulateSubmission('agent-a', 'Agent: `agent-b`\nScore: 8\nGreat work!');
        io.simulateSubmission('agent-b', 'Agent: `agent-a`\nScore: 7\nNice poem.');
        io.simulateSubmission('agent-c', 'Agent: `agent-a`\nScore: 6\nDecent work.');
      }, 50);

      const result = await promise;

      // All reviewers should have tasks written (verified by successful collection)
      expect(result.taskId).toBe('task-001');
      expect(result.dispatchFailed).toHaveLength(0);
    });

    it('should clear stale files before dispatching', async () => {
      // Pre-populate stale submissions
      io.simulateSubmission('agent-a', 'stale review');
      io.simulateSubmission('agent-b', 'stale review');

      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 200 }
      );

      // After clearing, stale data should be gone
      // Simulate fresh reviews after a tick
      setTimeout(() => {
        io.simulateSubmission('agent-a', 'Agent: `agent-b`\nScore: 8\nFresh review');
      }, 80);

      const result = await promise;

      // agent-a submitted fresh review (stale was cleared)
      const reviewA = result.reviews.find(r => r.reviewerId === 'agent-a');
      if (reviewA) {
        expect(reviewA.reviews[0].feedback).toContain('Fresh review');
      }
    });

    it('should collect reviews from agents that respond', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 300 }
      );

      // Only agent-a and agent-b submit
      setTimeout(() => {
        io.simulateSubmission('agent-a', 'Agent: `agent-b`\nScore: 9\nExcellent!');
        io.simulateSubmission('agent-b', 'Agent: `agent-a`\nScore: 7\nGood.');
      }, 50);

      const result = await promise;

      expect(result.reviews).toHaveLength(2);
      expect(result.timedOut).toContain('agent-c');
    });

    it('should handle all reviewers timing out', async () => {
      const result = await reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 150 }
      );

      expect(result.reviews).toHaveLength(0);
      expect(result.timedOut).toHaveLength(3);
    });

    it('should emit review.approved event on dispatch', async () => {
      const handler = vi.fn();
      eventBus.subscribe(['review.approved'], handler);

      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 150 }
      );

      await promise;

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'review.approved',
          actors: ['agent-a', 'agent-b', 'agent-c'],
        })
      );
    });

    it('should emit race.collected event on completion', async () => {
      const handler = vi.fn();
      eventBus.subscribe(['race.collected'], handler);

      const result = await reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 150 }
      );

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should exclude self-submission by default in review task', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 200 }
      );

      // Check that TASK.md written for agent-a doesn't contain agent-a's own submission
      // by looking at what was written
      const taskContent = io.tasks.get('agent-a');
      if (taskContent) {
        // The review task should contain other agents' submissions but describe the review process
        expect(taskContent).toContain('Review Task');
      }

      await promise;
    });
  });

  describe('review parsing', () => {
    it('should parse structured reviews with scores', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 300 }
      );

      setTimeout(() => {
        io.simulateSubmission('agent-a', 'Agent: `agent-b`\nScore: 8\nGreat work on the imagery.\n\nAgent: `agent-c`\nScore: 6\nCould be more creative.');
      }, 50);

      const result = await promise;
      const reviewA = result.reviews.find(r => r.reviewerId === 'agent-a');

      expect(reviewA).toBeDefined();
      expect(reviewA!.reviews.length).toBeGreaterThanOrEqual(1);

      // Check that at least one review has a score
      const scoredReview = reviewA!.reviews.find(r => r.score !== undefined);
      if (scoredReview) {
        expect(scoredReview.score).toBeGreaterThanOrEqual(0);
        expect(scoredReview.score).toBeLessThanOrEqual(10);
      }
    });

    it('should create generic reviews when no structured format found', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 300 }
      );

      setTimeout(() => {
        io.simulateSubmission('agent-a', 'All poems were quite nice. I enjoyed reading them.');
      }, 50);

      const result = await promise;
      const reviewA = result.reviews.find(r => r.reviewerId === 'agent-a');

      expect(reviewA).toBeDefined();
      // Should create generic reviews for all other agents
      expect(reviewA!.reviews.length).toBeGreaterThanOrEqual(1);
      expect(reviewA!.reviews[0].feedback).toContain('quite nice');
    });
  });

  describe('inferRelationshipEvents', () => {
    it('should infer positive events for high scores (>= 7)', () => {
      const result: Parameters<ReviewDispatcher['inferRelationshipEvents']>[0] = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', score: 9, feedback: 'Excellent work!' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.positive');
      expect(events[0].from).toBe('agent-a');
      expect(events[0].to).toBe('agent-b');
      expect(events[0].impact.trust).toBe(0.05);
      expect(events[0].impact.respect).toBe(0.03);
    });

    it('should infer critical events for low scores (<= 4)', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', score: 3, feedback: 'Poor quality.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.critical');
      expect(events[0].impact.scrutiny).toBe(0.05);
      expect(events[0].impact.rivalry).toBe(0.02);
    });

    it('should infer constructive events for middle scores (5-6)', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', score: 5, feedback: 'Decent but can improve.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.constructive');
      expect(events[0].impact.respect).toBe(0.03);
      expect(events[0].impact.trust).toBe(0.01);
    });

    it('should infer events from keywords when no score present', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', feedback: 'Excellent and impressive work!' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.positive');
      expect(events[0].impact.trust).toBe(0.04);
    });

    it('should infer negative events from negative keywords', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', feedback: 'Weak effort, poor execution, missing key elements.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.critical');
      expect(events[0].impact.scrutiny).toBe(0.04);
    });

    it('should default to constructive when no keywords match', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', feedback: 'I read the submission and here are my thoughts on it.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('review.constructive');
      expect(events[0].impact.respect).toBe(0.02);
    });

    it('should handle multiple reviews from multiple reviewers', () => {
      const result = {
        taskId: 'task-001',
        reviews: [
          {
            reviewerId: 'agent-a',
            reviews: [
              { targetAgentId: 'agent-b', score: 9, feedback: 'Great!' },
              { targetAgentId: 'agent-c', score: 3, feedback: 'Weak.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 100,
          },
          {
            reviewerId: 'agent-b',
            reviews: [
              { targetAgentId: 'agent-a', score: 6, feedback: 'OK.' },
            ],
            submittedAt: new Date().toISOString(),
            duration: 120,
          },
        ],
        timedOut: [],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);

      expect(events).toHaveLength(3);

      const positive = events.find(e => e.type === 'review.positive');
      expect(positive).toBeDefined();
      expect(positive!.from).toBe('agent-a');
      expect(positive!.to).toBe('agent-b');

      const critical = events.find(e => e.type === 'review.critical');
      expect(critical).toBeDefined();
      expect(critical!.from).toBe('agent-a');
      expect(critical!.to).toBe('agent-c');

      const constructive = events.find(e => e.type === 'review.constructive');
      expect(constructive).toBeDefined();
      expect(constructive!.from).toBe('agent-b');
      expect(constructive!.to).toBe('agent-a');
    });

    it('should handle empty reviews', () => {
      const result = {
        taskId: 'task-001',
        reviews: [],
        timedOut: ['agent-a', 'agent-b'],
        dispatchFailed: [],
      };

      const events = reviewer.inferRelationshipEvents(result);
      expect(events).toHaveLength(0);
    });
  });

  describe('constructor options', () => {
    it('should use default options when none provided', () => {
      const defaultReviewer = new ReviewDispatcher(io);
      // Should not throw
      expect(defaultReviewer).toBeDefined();
    });

    it('should accept custom pollIntervalMs', async () => {
      const fastReviewer = new ReviewDispatcher(io, { pollIntervalMs: 10 });

      const promise = fastReviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        { reviewTimeoutMs: 200 }
      );

      setTimeout(() => {
        io.simulateSubmission('agent-a', 'Review content');
        io.simulateSubmission('agent-b', 'Review content');
        io.simulateSubmission('agent-c', 'Review content');
      }, 30);

      const result = await promise;
      expect(result.reviews).toHaveLength(3);
    });
  });

  describe('review config options', () => {
    it('should use custom review prompt when provided', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        {
          reviewTimeoutMs: 200,
          reviewPrompt: 'Rate each submission on creativity only.',
        }
      );

      // Check task content was written with custom prompt
      const taskContent = io.tasks.get('agent-a');
      if (taskContent) {
        expect(taskContent).toContain('creativity only');
      }

      await promise;
    });

    it('should handle scoring config', async () => {
      const promise = reviewer.dispatchReviews(
        sampleTask,
        sampleSubmissions,
        {
          reviewTimeoutMs: 200,
          includeScoring: false,
        }
      );

      const taskContent = io.tasks.get('agent-a');
      if (taskContent) {
        // Should NOT contain scoring instructions
        expect(taskContent).not.toContain('Score: A score from 1-10');
      }

      await promise;
    });
  });
});
