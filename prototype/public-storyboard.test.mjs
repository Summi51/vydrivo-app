import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStoryboard, storyboardHash, requireReview } from './storyboard.mjs';

function board() {
  return {
    schemaVersion: 1,
    title: 'Test only',
    scenes: Array.from({ length: 3 }, (_, index) => ({
      id: `scene-${index}`,
      title: 'Scene',
      narration: 'Hello',
      visualKind: 'ai-generated-footage',
      visualPrompt: 'A river flows',
      estimatedSeconds: 20,
    })),
  };
}

test('storyboard rejects duplicate scene ids', () => {
  const value = board();
  validateStoryboard(value);
  value.scenes[1].id = value.scenes[0].id;
  assert.throws(() => validateStoryboard(value));
});

test('review is invalidated when narration changes', () => {
  const value = board();
  const approval = { approved: true, storyboardHash: storyboardHash(value) };
  requireReview(value, approval);
  value.scenes[0].narration = 'Changed';
  assert.throws(() => requireReview(value, approval));
});
