import { describe, it, expect } from 'vitest';
import { DATE_NIGHT_IDEAS, randomDateNightIdea } from './dateNightIdeas';

describe('DATE_NIGHT_IDEAS', () => {
  it('has at least 20 ideas', () => {
    expect(DATE_NIGHT_IDEAS.length).toBeGreaterThanOrEqual(20);
  });

  it('every idea has required fields', () => {
    for (const idea of DATE_NIGHT_IDEAS) {
      expect(idea.id).toBeTruthy();
      expect(idea.title).toBeTruthy();
      expect(['cozy', 'adventure', 'classic', 'creative', 'cheap']).toContain(idea.category);
      expect(['$', '$$', '$$$']).toContain(idea.cost);
      expect(idea.icon).toBeTruthy();
    }
  });

  it('IDs are unique', () => {
    const ids = DATE_NIGHT_IDEAS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all 5 categories', () => {
    const cats = new Set(DATE_NIGHT_IDEAS.map(i => i.category));
    expect(cats.has('cozy')).toBe(true);
    expect(cats.has('adventure')).toBe(true);
    expect(cats.has('classic')).toBe(true);
    expect(cats.has('creative')).toBe(true);
    expect(cats.has('cheap')).toBe(true);
  });
});

describe('randomDateNightIdea', () => {
  it('returns a valid idea with no filter', () => {
    const idea = randomDateNightIdea();
    expect(idea.id).toBeTruthy();
    expect(idea.title).toBeTruthy();
  });

  it('returns idea matching category filter', () => {
    for (let i = 0; i < 10; i++) {
      const idea = randomDateNightIdea({ category: 'cozy' });
      expect(idea.category).toBe('cozy');
    }
  });

  it('returns idea matching cost filter', () => {
    for (let i = 0; i < 10; i++) {
      const idea = randomDateNightIdea({ cost: '$' });
      expect(idea.cost).toBe('$');
    }
  });

  it('falls back to full pool when filter yields nothing', () => {
    // '$$$' cost does not exist in the dataset
    const idea = randomDateNightIdea({ cost: '$$$' });
    expect(idea).toBeDefined();
    expect(DATE_NIGHT_IDEAS).toContain(idea);
  });

  it('applies both category and cost filters', () => {
    // cozy + $ should have multiple matches
    for (let i = 0; i < 5; i++) {
      const idea = randomDateNightIdea({ category: 'cozy', cost: '$' });
      expect(idea.category).toBe('cozy');
      expect(idea.cost).toBe('$');
    }
  });
});
