import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createWorkerTracker } from "./async-tracker";

class FakeWorker {
  static instances: FakeWorker[] = [];
  static autoReady = true;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  messages: { type: string; id?: number }[] = [];
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(message: { type: string; id?: number }) {
    this.messages.push(message);
    if (message.type === "init" && FakeWorker.autoReady)
      queueMicrotask(() => this.onmessage?.({ data: { type: "ready", delegate: "GPU" } }));
  }
  terminate() {
    this.terminated = true;
  }
  result() {
    const id = this.messages.at(-1)?.id;
    this.onmessage?.({
      data: { type: "result", id, landmarks: null, gesture: null, inferenceMs: 12 },
    });
  }
}
const bitmap = () => ({ close: vi.fn() });
beforeEach(() => {
  FakeWorker.instances = [];
  FakeWorker.autoReady = true;
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("location", { href: "https://example.test/hacktx2026/vision.html" });
  vi.stubGlobal("document", { baseURI: "https://example.test/hacktx2026/vision.html" });
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => bitmap()),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const canvas = {} as HTMLCanvasElement;

it("matches responses and prevents a second frame from queuing", async () => {
  const tracker = await createWorkerTracker("runner");
  expect(tracker.backend).toBe("worker / GPU");
  const first = tracker.detect(canvas, 10);
  await expect(tracker.detect(canvas, 20)).rejects.toThrow("already in progress");
  await Promise.resolve();
  FakeWorker.instances[0].result();
  await expect(first).resolves.toMatchObject({ landmarks: null, inferenceMs: 12 });
  tracker.close();
});
it("rejects pending inference when stopped and terminates once", async () => {
  const tracker = await createWorkerTracker("saboteur");
  const pending = tracker.detect(canvas, 10);
  const rejected = expect(pending).rejects.toThrow("stopped");
  await Promise.resolve();
  tracker.close();
  tracker.close();
  await rejected;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
it("closes a late bitmap rather than sending it to a terminated worker", async () => {
  let resolve!: (image: ReturnType<typeof bitmap>) => void;
  const image = bitmap();
  vi.stubGlobal(
    "createImageBitmap",
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const tracker = await createWorkerTracker("runner");
  const pending = tracker.detect(canvas, 10);
  const rejected = expect(pending).rejects.toThrow("stopped");
  tracker.close();
  resolve(image);
  await rejected;
  expect(image.close).toHaveBeenCalledOnce();
  expect(FakeWorker.instances[0].messages).toHaveLength(1);
});
it("aborts a model initialization immediately", async () => {
  FakeWorker.autoReady = false;
  const controller = new AbortController();
  const pending = createWorkerTracker("runner", controller.signal);
  const rejected = expect(pending).rejects.toThrow("stopped");
  controller.abort();
  await rejected;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
it("times out a hung inference and releases its worker", async () => {
  vi.useFakeTimers();
  const tracker = await createWorkerTracker("runner");
  const pending = tracker.detect(canvas, 10);
  const rejected = expect(pending).rejects.toThrow("timed out");
  await vi.advanceTimersByTimeAsync(20001);
  await rejected;
  expect(FakeWorker.instances[0].terminated).toBe(true);
});
