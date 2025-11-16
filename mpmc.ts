import { CLOSED, ClosedChannelError } from "./mod.ts";

/**
 * An unbounded multi-producer multi-consumer channel.
 *
 * This channel broadcasts each value sent via {@link send} to all forked
 * receivers created with {@link fork}. Each receiver gets its own queue and can
 * consume values independently using `for await` iteration or the
 * {@link MultiChannelReceiver.receive} methods.
 */
export class UnboundedMultiChannel<T> {
  #buffer: T[] = [];
  #receivers = new Set<MultiChannelReceiver<T>>();
  #closed = false;

  /** Sends a value to all forked receivers. */
  send(value: T) {
    if (this.#closed) {
      throw new ClosedChannelError();
    }
    this.#buffer.push(value);
    for (const receiver of this.#receivers) {
      receiver._push(value);
    }
  }

  /** Closes the channel, signaling no more values will be sent. */
  close() {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    for (const receiver of this.#receivers) {
      receiver._close();
    }
  }

  /** Returns whether the channel is closed. */
  get isClosed(): boolean {
    return this.#closed;
  }

  /**
   * Forks the channel, creating a new receiver that will observe all values
   * sent so far, followed by any future values.
   */
  fork(): MultiChannelReceiver<T> {
    const receiver = new MultiChannelReceiver<T>();
    // Replay all past values to the new receiver.
    receiver._prime(this.#buffer);
    if (this.#closed) {
      receiver._close();
    } else {
      this.#receivers.add(receiver);
    }
    return receiver;
  }
}

/**
 * A receiver for {@link UnboundedMultiChannel}.
 *
 * Each receiver has its own internal queue and can be consumed independently.
 */
export class MultiChannelReceiver<T> {
  #queue: T[] = [];
  #waiters: (() => void)[] = [];
  #closed = false;

  /** @internal */
  _prime(values: readonly T[]) {
    if (this.#closed || values.length === 0) {
      return;
    }
    this.#queue.push(...values);
  }

  /** @internal */
  _push(value: T) {
    if (this.#closed) {
      return;
    }
    this.#queue.push(value);
    this.#waiters.shift()?.();
  }

  /** @internal */
  _close() {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    for (const waiter of this.#waiters) {
      waiter();
    }
    this.#waiters = [];
  }

  /** Receives a value from the receiver. If the channel is closed, returns {@link CLOSED}. */
  async receive(): Promise<T | typeof CLOSED> {
    if (this.#queue.length === 0 && this.#closed) {
      return CLOSED;
    }
    if (this.#queue.length === 0) {
      await new Promise<void>((resolve) => this.#waiters.push(resolve));
      if (this.#closed && this.#queue.length === 0) {
        return CLOSED;
      }
    }
    return this.#queue.shift() as T;
  }

  /** Receives a value from the receiver. If the channel is closed, throws a {@link ClosedChannelError}. */
  async receiveOrThrow(): Promise<T> {
    const value = await this.receive();
    if (value === CLOSED) {
      throw new ClosedChannelError();
    }
    return value;
  }

  /** Peeks at the next value in the receiver. If the channel is closed, returns {@link CLOSED}. */
  peek(): T | undefined | typeof CLOSED {
    if (this.#queue.length === 0 && this.#closed) {
      return CLOSED;
    }
    return this.#queue[0];
  }

  /** Peeks at the next value in the receiver. If the channel is closed, throws a {@link ClosedChannelError}. */
  peekOrThrow(): T | undefined {
    const value = this.peek();
    if (value === CLOSED) {
      throw new ClosedChannelError();
    }
    return value as T | undefined;
  }

  /** Returns the number of values buffered in this receiver. */
  get length(): number {
    return this.#queue.length;
  }

  /** Returns whether there are no buffered values. */
  get isEmpty(): boolean {
    return this.#queue.length === 0;
  }

  /** Returns an async generator that drains this receiver. */
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
