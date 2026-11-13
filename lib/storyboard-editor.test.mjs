import assert from 'node:assert/strict';
import test from 'node:test';
import { createScene, duplicateScene, validateStoryboardDraft } from './storyboard-editor.js';

function scene(id, seconds = 25, visualKind = 'ai-generated-footage') {
  return {
    id,
    title: `Scene ${id}`,
    narration: 'A clear, measured narration line.',
    visualKind,
    visualPrompt: 'A clean, vertical visual direction.',
    estimatedSeconds: seconds,
  };
}

test('a three-scene 75 second footage board validates', () => {
  const result = validateStoryboardDraft({
    title: 'Reviewed storyboard',
    scenes: [scene('scene-1'), scene('scene-2'), scene('scene-3')],
  });
  assert.equal(result.ok, true);
  assert.equal(result.totalSeconds, 75);
  assert.equal(result.footageSeconds, 75);
  assert.equal(result.footagePercent, 100);
});

test('duration, footage coverage and required fields are enforced', () => {
  const short = validateStoryboardDraft({ title: 'Short', scenes: [scene('scene-1', 20)] });
  assert.equal(short.ok, false);
  assert.match(short.errors.join(' '), /60–90 seconds/);

  const tooLong = validateStoryboardDraft({ title: 'Long', scenes: [scene('scene-1', 30), scene('scene-2', 30), scene('scene-3', 30), scene('scene-4', 5)] });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.errors.join(' '), /60–90 seconds/);

  const graphicsHeavy = validateStoryboardDraft({
    title: 'Graphics',
    scenes: [scene('scene-1', 30, 'motion-graphics'), scene('scene-2', 25, 'ai-generated-footage'), scene('scene-3', 20, 'motion-graphics')],
  });
  assert.equal(graphicsHeavy.ok, false);
  assert.match(graphicsHeavy.errors.join(' '), /half of the timeline/);

  const missing = validateStoryboardDraft({ title: '', scenes: [scene('scene-1', 30), { ...scene('scene-2', 30), narration: '' }] });
  assert.equal(missing.ok, false);
  assert.match(missing.errors.join(' '), /title/);
  assert.match(missing.errors.join(' '), /narration/);
});

test('scene reference ids are optional but must be UUIDs', () => {
  const board = {
    title: 'Reference board',
    scenes: [scene('scene-1'), scene('scene-2'), scene('scene-3')],
  };
  board.scenes[0].referenceAssetId = '11111111-1111-4111-8111-111111111111';
  assert.equal(validateStoryboardDraft(board).ok, true);
  board.scenes[0].referenceAssetId = 'not-a-uuid';
  assert.equal(validateStoryboardDraft(board).ok, false);
  board.scenes[0].referenceAssetId = null;
  assert.equal(validateStoryboardDraft(board).ok, true);
  assert.equal(createScene([]).referenceAssetId, null);
});

test('new and duplicated scenes receive unique safe ids', () => {
  const scenes = [scene('scene-1')];
  const added = createScene(scenes);
  assert.equal(added.id, 'scene-2');
  assert.equal(added.estimatedSeconds, 20);
  assert.equal(added.narration, '');
  const current = [...scenes, added];
  const copy = duplicateScene(added, current);
  assert.equal(copy.id, 'scene-3');
  const secondCopy = duplicateScene(copy, [...current, copy]);
  assert.equal(secondCopy.id, 'scene-4');
  assert.match(copy.title, /copy$/);
});
