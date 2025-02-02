import { assertEquals } from "@std/assert";
import { createCrossTest } from "@sevenc-nanashi/cross-test";
import { UnboundedChannel } from "./mpsc.ts";
import { CLOSED } from "./mod.ts";

const crossTest = await createCrossTest(import.meta.url, {
  runtimes: ["deno", "node", "bun", "browser"],
});

crossTest("mpsc", async () => {
  const channel = new UnboundedChannel<number>();
  const values = [1, 2, 3, 4, 5];
  const received: number[] = [];

  const send = () => {
    for (const value of values) {
      channel.send(value);
    }
    channel.close();
  };

  const receive = async () => {
    for await (const value of channel) {
      if (value === CLOSED) {
        break;
      }
      received.push(value);
    }
  };

  send();
  await receive();
  assertEquals(received, values);
});
