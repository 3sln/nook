// Native sharing always requires the browser's surface chooser. A session reuses
// the chosen stream for multiple snapshots and releases it on Done/abort.
export function createTabCaptureSession({ window = globalThis.window } = {}) {
  let stream,
    controller,
    boundSignal,
    boundAbort,
    busy = false,
    count = 0;
  const stop = () => {
    const current = stream;
    stream = null;
    controller?.abort();
    controller = null;
    if (boundSignal && boundAbort)
      boundSignal.removeEventListener("abort", boundAbort);
    boundSignal = null;
    boundAbort = null;
    for (const track of current?.getTracks() || []) track.stop();
  };
  const capture = async ({ signal, name } = {}) => {
    if (busy) throw new Error("A snapshot is already being captured.");
    if (signal?.aborted)
      throw new DOMException("Capture canceled", "AbortError");
    if (!window.navigator.mediaDevices?.getDisplayMedia)
      throw new Error("Screen capture is not available in this browser.");
    busy = true;
    if (!controller) controller = new AbortController();
    const lifetime = controller.signal;
    if (signal !== boundSignal) {
      if (boundSignal && boundAbort)
        boundSignal.removeEventListener("abort", boundAbort);
      boundSignal = signal;
      boundAbort = stop;
      signal?.addEventListener("abort", stop, { once: true });
    }
    try {
      if (!stream) {
        const chosen = await window.navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
          preferCurrentTab: true,
          selfBrowserSurface: "include",
        });
        if (lifetime.aborted) {
          chosen.getTracks().forEach((track) => track.stop());
          throw new DOMException("Capture canceled", "AbortError");
        }
        stream = chosen;
        for (const track of stream.getTracks())
          track.addEventListener?.("ended", stop, { once: true });
      }
      const result = await snapshot(stream, {
        window,
        signal: lifetime,
        name: name || `app-screenshot-${count + 1}.png`,
      });
      count++;
      return result;
    } catch (error) {
      if (!stream) stop();
      throw error;
    } finally {
      busy = false;
    }
  };
  return { capture, stop };
}
export async function captureTabScreenshot({
  signal,
  window = globalThis.window,
} = {}) {
  const session = createTabCaptureSession({ window });
  try {
    return await session.capture({ signal, name: "app-screenshot.png" });
  } finally {
    session.stop();
  }
}
async function snapshot(stream, { window, signal, name }) {
  const video = window.document.createElement("video");
  try {
    if (signal.aborted)
      throw new DOMException("Capture canceled", "AbortError");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((resolve, reject) => {
      let frame;
      const finish = () => {
        signal.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        if (frame !== undefined) {
          if (video.cancelVideoFrameCallback)
            video.cancelVideoFrameCallback(frame);
          else window.cancelAnimationFrame?.(frame);
        }
        reject(new DOMException("Capture canceled", "AbortError"));
      };
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) {
        abort();
        return;
      }
      frame = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(finish)
        : window.requestAnimationFrame(finish);
    });
    if (signal.aborted)
      throw new DOMException("Capture canceled", "AbortError");
    const canvas = window.document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height)
      throw new Error("The shared view is not ready.");
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (signal.aborted)
      throw new DOMException("Capture canceled", "AbortError");
    if (!blob) throw new Error("Could not create a screenshot.");
    return new File([blob], name, { type: "image/png" });
  } finally {
    video.srcObject = null;
  }
}
