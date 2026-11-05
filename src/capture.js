// Optional native tab capture. The browser requires a user gesture and a sharing
// choice; the application must verify the selected surface is appropriate.
export async function captureTabScreenshot({
  signal,
  window = globalThis.window,
} = {}) {
  if (!window.navigator.mediaDevices?.getDisplayMedia)
    throw new Error("Screen capture is not available in this browser.");
  const stream = await window.navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
  });
  const tracks = stream.getTracks();
  const stop = () => tracks.forEach((track) => track.stop());
  signal?.addEventListener("abort", stop, { once: true });
  const video = window.document.createElement("video");
  try {
    if (signal?.aborted)
      throw new DOMException("Capture canceled", "AbortError");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await new Promise((resolve, reject) => {
      let frame;
      const finish = () => {
        signal?.removeEventListener("abort", abort);
        resolve();
      };
      const abort = () => {
        if (frame !== undefined) video.cancelVideoFrameCallback?.(frame);
        reject(new DOMException("Capture canceled", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) {
        abort();
        return;
      }
      frame = video.requestVideoFrameCallback
        ? video.requestVideoFrameCallback(finish)
        : window.requestAnimationFrame(finish);
    });
    if (signal?.aborted)
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
    if (!blob) throw new Error("Could not create a screenshot.");
    return new File([blob], "app-screenshot.png", { type: "image/png" });
  } finally {
    stop();
    signal?.removeEventListener("abort", stop);
    video.srcObject = null;
  }
}
