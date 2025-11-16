import { assertEquals } from "@std/assert";
import { createCrossTest } from "@sevenc-nanashi/cross-test";
import { UnboundedMultiChannel } from "./mpmc.ts";

const crossTest = await createCrossTest(import.meta.url, {
  runtimes: ["deno", "node", "bun"],
});

crossTest("mpmc - multi producers/consumers", async () => {
  const channel = new UnboundedMultiChannel<number>();

  const total = 200;
  const expected: number[] = Array.from({ length: total }, (_, i) => i);

  const producer1 = (async () => {
    for (let i = 0; i < 100; i++) {
      channel.send(i);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  })();
  const producer2 = (async () => {
    for (let i = 100; i < 200; i++) {
      channel.send(i);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  })();

  const buckets: number[][] = [[], [], [], []];
  const forkedChannels = buckets.map(() => channel.fork());
  const consumers = buckets.map(async (bucket, i) => {
    for await (const v of forkedChannels[i]) bucket.push(v);
  });

  await Promise.all([producer1, producer2]);
  channel.close();
  await Promise.all(consumers);

  for (const bucket of buckets) {
    assertEquals(bucket.length, total);
    assertEquals(
      [...bucket].sort((a, b) => a - b),
      expected,
    );
  }
});
