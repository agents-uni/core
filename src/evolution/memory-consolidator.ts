/**
 * Memory Consolidator — manages organizational learning.
 *
 * Organizations learn from experience. This module consolidates
 * individual agent experiences into organization-level lessons.
 */

import type { Lesson, OrganizationMemory } from '../types/index.js';
import type { EventBus } from '../core/event-bus.js';

let lessonCounter = 0;

export class MemoryConsolidator {
  private lessons: Map<string, Lesson>;
  private maxLessons: number;

  constructor(maxLessons = 100) {
    this.lessons = new Map();
    this.maxLessons = maxLessons;
  }

  /** Record a new lesson */
  addLesson(content: string, context: string, agents: string[]): Lesson {
    // Check for similar existing lessons
    const existing = this.findSimilar(content);
    if (existing) {
      existing.reinforcements++;
      return existing;
    }

    const lesson: Lesson = {
      id: `lesson-${++lessonCounter}`,
      content,
      context,
      agents,
      learnedAt: new Date().toISOString(),
      reinforcements: 1,
    };

    this.lessons.set(lesson.id, lesson);

    // Evict least reinforced if over limit
    if (this.lessons.size > this.maxLessons) {
      this.evictWeakest();
    }

    return lesson;
  }

  /** Find a lesson similar to the given content */
  findSimilar(content: string): Lesson | undefined {
    const normalized = content.toLowerCase().trim();
    for (const lesson of this.lessons.values()) {
      if (lesson.content.toLowerCase().trim() === normalized) {
        return lesson;
      }
    }
    return undefined;
  }

  /** Get all lessons sorted by reinforcement count */
  getLessons(): Lesson[] {
    return [...this.lessons.values()].sort((a, b) => b.reinforcements - a.reinforcements);
  }

  /** Get lessons involving a specific agent */
  getLessonsByAgent(agentId: string): Lesson[] {
    return this.getLessons().filter(l => l.agents.includes(agentId));
  }

  /** Get the top N most reinforced lessons */
  getTopLessons(n: number): Lesson[] {
    return this.getLessons().slice(0, n);
  }

  /** Export full memory state */
  exportMemory(): Pick<OrganizationMemory, 'lessons'> {
    return {
      lessons: this.getLessons(),
    };
  }

  /** Import lessons from a previous session */
  importLessons(lessons: Lesson[]): void {
    for (const lesson of lessons) {
      this.lessons.set(lesson.id, lesson);
    }
  }

  private evictWeakest(): void {
    let weakest: Lesson | undefined;
    for (const lesson of this.lessons.values()) {
      if (!weakest || lesson.reinforcements < weakest.reinforcements) {
        weakest = lesson;
      }
    }
    if (weakest) {
      this.lessons.delete(weakest.id);
    }
  }
}
