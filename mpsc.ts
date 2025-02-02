import { CLOSED, ClosedChannelError } from "./mod.ts";

/**
 * An asynchronous channel that can be used to communicate between async functions.
 *
 * Note that this is Multi-Producer Single-Consumer (MPSC) channel, meaning that multiple async functions can send values to the channel,
 * but only one async function can receive values from the channel.
 */
export class UnboundedChannel<T> {
  #queue: T[] = [];
  #waiters: (() => void)[] = [];
  #closed = false;

  /** Constructs a new channel. */
  constructor() {}

  /** Sends a value to the channel. */
  send(value: T) {
    if (this.#closed) {
      throw new ClosedChannelError();
    }
    this.#queue.push(value);
    this.#waiters.shift()?.();
  }

  /** Closes the channel. */
  close() {
    this.#closed = true;
    for (const waiter of this.#waiters) {
      waiter();
    }
  }

  /** Returns whether the channel is closed. */
  get isClosed(): boolean {
    return this.#closed;
  }

  /** Receives a value from the channel. If the channel is closed, returns {@link CLOSED}. */
  async receive(): Promise<T | typeof CLOSED> {
    if (this.#queue.length === 0 && this.#closed) {
      return CLOSED;
    }
    if (this.#queue.length === 0) {
      await new Promise<void>((resolve) => this.#waiters.push(resolve));
      if (this.#closed) {
        return CLOSED;
      }
    }
    return this.#queue.shift() as T;
  }

  /** Receives a value from the channel. If the channel is closed, throws a {@link ClosedChannelError}. */
  async receiveOrThrow(): Promise<T> {
    const value = await this.receive();
    if (value === CLOSED) {
      throw new ClosedChannelError();
    }
    return value;
  }

  /** Peeks at the next value in the channel. If the channel is closed, returns {@link CLOSED}. */
  peek(): T | undefined | typeof CLOSED {
    if (this.#queue.length === 0 && this.#closed) {
      return CLOSED;
    }
    return this.#queue[0];
  }

  /** Peeks at the next value in the channel. If the channel is closed, throws a {@link ClosedChannelError}. */
  peekOrThrow(): T | undefined {
    const value = this.peek();
    if (value === CLOSED) {
      throw new ClosedChannelError();
    }
    return value as T | undefined;
  }

  /** Returns the number of values in the channel. */
  get length(): number {
    return this.#queue.length;
  }

  /** Returns whether the channel is empty. */
  get isEmpty(): boolean {
    return this.#queue.length === 0;
  }

  /** Returns an async generator that can be used to receive values from the channel. */
  async *drain(): AsyncGenerator<T, void, void> {
    while (true) {
      const received = await this.receive();
      if (received === CLOSED) {
        break;
      }
      yield received;
    }
  }

  /** Alias for {@link drain}. */
  [Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
    return this.drain();
  }
}
