import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import bounds from "../src/ui/bounds.js";

function fixture({ wrapped = false, visual = true } = {}) {
  const window = new Window({ width: 390, height: 844 });
  const viewport = new window.EventTarget();
  Object.assign(viewport, {
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
    height: 844,
  });
  Object.defineProperty(window, "visualViewport", {
    value: visual ? viewport : undefined,
    configurable: true,
  });
  const host = window.document.createElement("div");
  host.attachShadow({ mode: "open" });
  host.appSlot = window.document.createElement("slot");
  host.shadowRoot.append(host.appSlot);
  host.i18n = { refresh() {} };
  if (wrapped) {
    host.append(window.document.createElement("main"));
    host.getBoundingClientRect = () => ({
      left: 20,
      top: 80,
      right: 370,
      bottom: 780,
    });
  }
  window.document.body.append(host);
  const controller = new AbortController();
  let changes = 0;
  const boundary = bounds(host, {
    signal: controller.signal,
    onChange() {
      changes++;
    },
  });
  return {
    window,
    viewport,
    host,
    controller,
    boundary,
    get changes() {
      return changes;
    },
    async change(values, event = "resize") {
      Object.assign(viewport, values);
      viewport.dispatchEvent(new window.Event(event));
      await window.happyDOM.waitUntilComplete();
    },
    async dispose() {
      controller.abort();
      await window.happyDOM.abort();
    },
  };
}

test("bounds follow keyboard-only visual viewport resize and pan, then restore", async () => {
  const h = fixture();
  try {
    assert.equal(h.boundary.rect.bottom, 844);
    await h.change({ height: 360, offsetTop: 96 });
    assert.equal(h.window.innerHeight, 844);
    assert.equal(h.boundary.rect.top, 96);
    assert.equal(h.boundary.rect.bottom, 456);
    assert.equal(h.host.style.getPropertyValue("--nook-bound-bottom"), "388px");
    assert.equal(h.host.style.getPropertyValue("--nook-bound-height"), "360px");
    await h.change({ offsetTop: 120 }, "scroll");
    assert.equal(h.boundary.rect.bottom, 480);
    assert.equal(h.host.style.getPropertyValue("--nook-bound-bottom"), "364px");
    await h.change({ offsetLeft: 30, width: 330, height: 330 });
    assert.equal(h.boundary.rect.left, 30);
    assert.equal(h.boundary.rect.right, 360);
    await h.change({ offsetLeft: 0, offsetTop: 0, width: 390, height: 844 });
    assert.equal(h.boundary.rect.bottom, 844);
    assert.equal(h.host.style.getPropertyValue("--nook-bound-bottom"), "0px");
  } finally {
    await h.dispose();
  }
});

test("wrapped app bounds intersect the keyboard-visible area and retain app limits", async () => {
  const h = fixture({ wrapped: true });
  try {
    assert.equal(h.boundary.rect.bottom, 780);
    await h.change({ offsetTop: 96, height: 360 });
    assert.equal(h.boundary.rect.top, 96);
    assert.equal(h.boundary.rect.bottom, 456);
    assert.equal(h.boundary.rect.left, 20);
    assert.equal(h.boundary.rect.right, 370);
    await h.change({ offsetTop: 0, height: 844 });
    assert.equal(h.boundary.rect.top, 80);
    assert.equal(h.boundary.rect.bottom, 780);
    assert.equal(h.host.style.getPropertyValue("--nook-bound-bottom"), "64px");
  } finally {
    await h.dispose();
  }
});

test("viewport listeners and pending frames are released on disconnect", async () => {
  const h = fixture();
  try {
    h.viewport.height = 400;
    h.viewport.dispatchEvent(new h.window.Event("resize"));
    h.controller.abort();
    const before = h.changes;
    await h.change({ height: 300, offsetTop: 50 }, "scroll");
    assert.equal(h.changes, before);
    assert.equal(h.host.shadowRoot.querySelector(".boundary-measure"), null);
  } finally {
    await h.dispose();
  }
});

test("window resize still updates bounds without a Visual Viewport API", async () => {
  const h = fixture({ visual: false });
  try {
    h.window.innerHeight = 400;
    h.window.dispatchEvent(new h.window.Event("resize"));
    await h.window.happyDOM.waitUntilComplete();
    assert.equal(h.boundary.rect.height, 400);
    assert.equal(h.host.style.getPropertyValue("--nook-bound-bottom"), "0px");
  } finally {
    await h.dispose();
  }
});
