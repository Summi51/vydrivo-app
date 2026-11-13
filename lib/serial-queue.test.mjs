import assert from 'node:assert/strict';
import test from 'node:test';
import { createSerialQueue } from './serial-queue.js';

test('serial queue runs tasks in enqueue order', async () => {
  const enqueue = createSerialQueue();
  const order = [];
  let releaseFirst;
  let signalFirstStarted;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const firstStarted = new Promise((resolve) => { signalFirstStarted = resolve; });

  const first = enqueue(async () => {
    order.push('first:start');
    signalFirstStarted();
    await firstGate;
    order.push('first:end');
    return 1;
  });
  const second = enqueue(async () => {
    order.push('second:start');
    order.push('second:end');
    return 2;
  });

  await firstStarted;
  assert.deepEqual(order, ['first:start']);
  releaseFirst();
  assert.equal(await first, 1);
  assert.equal(await second, 2);
  assert.deepEqual(order, ['first:start', 'first:end', 'second:start', 'second:end']);
});

test('serial queue continues after a rejected task', async () => {
  const enqueue = createSerialQueue();
  const order = [];

  const failed = enqueue(async () => {
    order.push('failed');
    throw new Error('expected failure');
  });
  const recovered = enqueue(async () => {
    order.push('recovered');
    return 'ok';
  });

  await assert.rejects(() => failed, /expected failure/);
  assert.equal(await recovered, 'ok');
  assert.deepEqual(order, ['failed', 'recovered']);
});
