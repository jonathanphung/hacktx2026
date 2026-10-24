/* Classic worker deliberately: MediaPipe's local WASM loader requires importScripts. */
let model;
let kind;
let ready = false;
self.onmessage = async ({ data }) => {
  if (data.type === "init") {
    try {
      // Raw vendor source avoids Vite's ESM development injection in this classic script.
      const runtime = URL.createObjectURL(
        new Blob([data.runtimeSource], { type: "text/javascript" }),
      );
      try {
        importScripts(runtime);
      } finally {
        URL.revokeObjectURL(runtime);
      }
      const files = await Vision.FilesetResolver.forVisionTasks(data.wasmUrl);
      kind = data.player === "runner" ? "hand" : "gesture";
      const task = kind === "hand" ? Vision.HandLandmarker : Vision.GestureRecognizer;
      const create = (delegate) =>
        task.createFromOptions(files, {
          baseOptions: { modelAssetPath: data.modelUrl, delegate },
          runningMode: "VIDEO",
          numHands: 1,
        });
      let delegate = "GPU";
      try {
        model = await create(delegate);
      } catch {
        delegate = "CPU";
        model = await create(delegate);
      }
      ready = true;
      self.postMessage({ type: "ready", delegate });
    } catch (error) {
      self.postMessage({ type: "error", message: String(error) });
    }
    return;
  }
  if (data.type === "detect") {
    try {
      if (!ready) throw new Error("Tracker not initialized");
      const start = performance.now();
      const result =
        kind === "hand"
          ? model.detectForVideo(data.image, data.t)
          : model.recognizeForVideo(data.image, data.t);
      const pose = result.gestures?.[0]?.[0];
      self.postMessage({
        type: "result",
        id: data.id,
        landmarks: result.landmarks[0]?.map(({ x, y }) => ({ x, y })) ?? null,
        gesture: pose?.score >= 0.7 ? pose.categoryName : null,
        inferenceMs: performance.now() - start,
      });
    } catch (error) {
      self.postMessage({ type: "error", id: data.id, message: String(error) });
    } finally {
      data.image.close();
    }
  }
};
