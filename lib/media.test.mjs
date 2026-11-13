import assert from 'node:assert/strict';
import test from 'node:test';
import { mediaUrl } from './media.js';

test('media url falls back to the local public folder when no base is set', () => {
  assert.equal(mediaUrl('hero-ai-lab.mp4', ''), '/videos/hero-ai-lab.mp4');
  assert.equal(mediaUrl('/videos/demo.mp4', ''), '/videos/demo.mp4');
});

test('media url uses the configured media origin', () => {
  assert.equal(
    mediaUrl('hero-ai-lab.mp4', 'https://media.example.com/videos'),
    'https://media.example.com/videos/hero-ai-lab.mp4',
  );
});

test('media url normalises slashes and ignores empty paths', () => {
  assert.equal(
    mediaUrl('/videos/hero.mp4', 'https://media.example.com/videos/'),
    'https://media.example.com/videos/hero.mp4',
  );
  assert.equal(mediaUrl('', 'https://media.example.com/videos'), '');
  assert.equal(mediaUrl(null, 'https://media.example.com/videos'), '');
});
