# async-channel

[![JSR](https://jsr.io/badges/@sevenc-nanashi/async-channel)](https://jsr.io/@sevenc-nanashi/async-channel)\
Simple async channel implementation for TypeScript.

## Installation

Please follow [jsr documentation](https://jsr.io/docs/using-packages) for
installation instructions.

```bash
# Deno
deno add @sevenc-nanashi/async-channel

# Node.js (one of the below, depending on your package manager)
npx jsr add @sevenc-nanashi/async-channel
yarn dlx jsr add @sevenc-nanashi/async-channel
pnpm dlx jsr add @sevenc-nanashi/async-channel

# Bun
bunx jsr add @sevenc-nanashi/async-channel
```

## Usage

- MPSC (multi-producer single-consumer): see `mpsc.ts` and
  [./mpsc_test.ts](./mpsc_test.ts).
- MPMC (multi-producer multi-consumer): see `mpmc.ts` and
  [./mpmc_test.ts](./mpmc_test.ts).

## License

This library is licensed under the MIT license.
