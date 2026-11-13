export function createSerialQueue() {
  let tail = Promise.resolve();

  return function enqueue(task) {
    const next = tail.then(task, task);
    tail = next.catch(() => {});
    return next;
  };
}
