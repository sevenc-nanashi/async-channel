/** A value that is used to indicate that a channel is closed. */
export const CLOSED: unique symbol = Symbol("closed");

/** An error that is thrown when trying to receive from a closed channel. */
export class ClosedChannelError extends Error {
  /** @ignore */
  constructor() {
    super("channel closed");
  }
}

export { UnboundedChannel } from "./mpsc.ts";
export { MultiChannelReceiver, UnboundedMultiChannel } from "./mpmc.ts";
