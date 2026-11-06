import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureTabScreenshot,
  createTabCaptureSession,
} from "../src/capture.js";
function harness({ defer = false } = {}) {
  let stopped = 0,
    drawn = 0,
    frame;
  const track = {
    stop() {
      stopped++;
    },
  };
  const stream = { getTracks: () => [track] };
  const video = {
    videoWidth: 640,
    videoHeight: 480,
    play: async () => {},
    requestVideoFrameCallback(callback) {
      frame = callback;
      if (!defer) queueMicrotask(callback);
      return 1;
    },
    cancelVideoFrameCallback() {},
  };
  const canvas = {
    getContext: () => ({
      drawImage() {
        drawn++;
      },
    }),
    toBlob(callback) {
      callback(new Blob(["png"], { type: "image/png" }));
    },
  };
  const window = {
    navigator: { mediaDevices: { getDisplayMedia: async () => stream } },
    document: { createElement: (tag) => (tag === "video" ? video : canvas) },
  };
  return {
    window,
    video,
    get stopped() {
      return stopped;
    },
    get drawn() {
      return drawn;
    },
    get ready() {
      return Boolean(frame);
    },
  };
}
test("native screenshot capture creates an image and always releases the stream", async () => {
  const h = harness();
  const file = await captureTabScreenshot({ window: h.window });
  assert.equal(file.name, "app-screenshot.png");
  assert.equal(file.type, "image/png");
  assert.equal(h.drawn, 1);
  assert.ok(h.stopped >= 1);
  assert.equal(h.video.srcObject, null);
});
test("capture cancellation rejects pending frames and releases tracks", async () => {
  const h = harness({ defer: true }),
    controller = new AbortController();
  const pending = captureTabScreenshot({
    window: h.window,
    signal: controller.signal,
  });
  while (!h.ready) await Promise.resolve();
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.ok(h.stopped >= 1);
  assert.equal(h.video.srcObject, null);
});

test("capture session reuses the sharing stream and releases it on Done", async () => {
  const h = harness();
  let prompts = 0;
  const get = h.window.navigator.mediaDevices.getDisplayMedia;
  h.window.navigator.mediaDevices.getDisplayMedia = () => {
    prompts++;
    return get();
  };
  const session = createTabCaptureSession({ window: h.window });
  const lifetime = new AbortController();
  const a = await session.capture({ signal: lifetime.signal });
  const b = await session.capture({ signal: lifetime.signal });
  assert.equal(prompts, 1);
  assert.equal(h.drawn, 2);
  assert.equal(h.stopped, 0);
  assert.equal(a.name, "app-screenshot-1.png");
  assert.equal(b.name, "app-screenshot-2.png");
  lifetime.abort();
  assert.equal(h.stopped, 1);
  session.stop();
  assert.equal(h.stopped, 1);
});
