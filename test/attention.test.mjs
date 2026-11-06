import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionResource, attentionKey } from "../src/providers/attention.js";
function harness(saved = new Map(), start = 0, random = () => 0.5) {
  let time = start,
    seen = false,
    nextId = 0;
  const timers = new Map();
  const owner = new EventTarget();
  owner.visibilityState = "visible";
  owner.defaultView = new EventTarget();
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const resource = attentionResource({
    owner,
    storage,
    hasSeen: () => seen,
    now: () => time,
    random,
    setTimer: (callback, delay) => {
      const id = ++nextId;
      timers.set(id, { callback, at: time + delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  return {
    resource,
    owner,
    storage,
    saved,
    timers,
    seen: () => {
      seen = true;
      resource.acknowledge();
    },
    tick(ms) {
      const end = time + ms;
      while (true) {
        const due = [...timers]
          .filter(([, v]) => v.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        time = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
      }
      time = end;
    },
  };
}
test("attention bursts stop after six seconds and retry around an hour until acknowledged", () => {
  const h = harness();
  const values = [];
  const stop = h.resource.subscribe((value) => values.push(value));
  assert.equal(values.at(-1), true);
  h.tick(6000);
  assert.equal(values.at(-1), false);
  const record = JSON.parse(h.saved.get(attentionKey));
  assert.equal(record.next, 60 * 60 * 1000);
  h.tick(record.next - 6001);
  assert.equal(values.at(-1), false);
  h.tick(1);
  assert.equal(values.at(-1), true);
  h.seen();
  assert.equal(values.at(-1), false);
  assert.equal(h.timers.size, 0);
  h.tick(2 * 60 * 60 * 1000);
  assert.equal(values.at(-1), false);
  stop();
});
test("attention retry jitter stays within 45–75 minutes and survives reloads", () => {
  for (const [random, minutes] of [
    [() => 0, 45],
    [() => 1, 75],
  ]) {
    const h = harness(new Map(), 0, random);
    const stop = h.resource.subscribe(() => {});
    assert.equal(
      JSON.parse(h.saved.get(attentionKey)).next,
      minutes * 60 * 1000,
    );
    stop();
    assert.equal(h.timers.size, 0);
    const reload = harness(h.saved, 10000, () => 0.5);
    const states = [];
    const release = reload.resource.subscribe((value) => states.push(value));
    assert.equal(states.at(-1), false);
    assert.equal(
      JSON.parse(reload.saved.get(attentionKey)).next,
      minutes * 60 * 1000,
    );
    release();
  }
});
test("hidden tabs defer reminders and the last subscriber releases timer/listeners", () => {
  const h = harness();
  const values = [];
  const first = h.resource.subscribe((value) => values.push(value));
  const second = h.resource.subscribe(() => {});
  assert.equal(h.timers.size, 1);
  first();
  assert.equal(h.timers.size, 1);
  h.owner.visibilityState = "hidden";
  h.owner.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.timers.size, 0);
  h.tick(90 * 60 * 1000);
  h.owner.visibilityState = "visible";
  h.owner.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.timers.size, 1);
  second();
  assert.equal(h.timers.size, 0);
  h.owner.dispatchEvent(new Event("visibilitychange"));
  assert.equal(h.timers.size, 0);
});
