import { expect, it } from "vitest";
import { FrameTask } from "./frame-task";
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
it("delivers runner results while the saboteur is still processing", async () => {
  const runner = new FrameTask<string>();
  const saboteur = new FrameTask<string>();
  let finishSaboteur!: (value: string) => void;
  const outputs: string[] = [];
  saboteur.run(
    1,
    () =>
      new Promise((resolve) => {
        finishSaboteur = resolve;
      }),
    (value) => outputs.push(value),
    () => {},
  );
  runner.run(
    1,
    async () => "left",
    (value) => outputs.push(value),
    () => {},
  );
  await flush();
  expect(outputs).toEqual(["left"]);
  expect(runner.canRun(2)).toBe(true);
  expect(saboteur.canRun(2)).toBe(false);
  finishSaboteur("aim");
  await flush();
  expect(outputs).toEqual(["left", "aim"]);
});
it("drops queued attempts and skips duplicate camera frames", async () => {
  const task = new FrameTask<number>();
  let finish!: (value: number) => void;
  const outputs: number[] = [];
  task.run(
    1,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    (value) => outputs.push(value),
    () => {},
  );
  task.run(
    2,
    async () => 2,
    (value) => outputs.push(value),
    () => {},
  );
  finish(1);
  await flush();
  expect(outputs).toEqual([1]);
  expect(task.canRun(1)).toBe(false);
  expect(task.canRun(3)).toBe(true);
});
it("does not emit late results after stop", async () => {
  const task = new FrameTask<number>();
  let finish!: (value: number) => void;
  let emitted = false;
  task.run(
    1,
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    () => {
      emitted = true;
    },
    () => {},
  );
  task.stop();
  finish(1);
  await flush();
  expect(emitted).toBe(false);
  expect(task.canRun(2)).toBe(false);
});
