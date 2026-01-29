# @ctalau/offguard

[![npm version](https://img.shields.io/npm/v/@ctalau/offguard.svg)](https://www.npmjs.com/package/@ctalau/offguard)
[![license](https://img.shields.io/npm/l/@ctalau/offguard.svg)](LICENSE)

TypeScript port of the ProGuard retrace tool for deobfuscating stack traces.

## Status

🚧 **Work in Progress** - This library is currently under active development.

## Overview

This project provides a TypeScript/JavaScript implementation of the ProGuard retrace tool, used to deobfuscate stack traces from Android applications obfuscated with ProGuard or R8.

## Installation

```bash
npm install @ctalau/offguard
```

```bash
pnpm add @ctalau/offguard
```

```bash
yarn add @ctalau/offguard
```

## Quick Start

```ts
import { retrace } from '@ctalau/offguard';

const obfuscatedStack = `\
java.lang.NullPointerException
    at a.a(Unknown Source:10)
    at b.b(Unknown Source:20)
`;

const mapping = `\
com.example.MyClass -> a:
    1:1:void doThing():42:42 -> a
com.example.Other -> b:
    1:1:void run():12:12 -> b
`;

const deobfuscated = retrace(obfuscatedStack, mapping);
console.log(deobfuscated);
```

## API Reference

### `retrace(stackTrace, mapping)`

Deobfuscates a stack trace string using a ProGuard mapping file.

| Parameter | Type | Description |
| --- | --- | --- |
| `stackTrace` | `string` | Obfuscated stack trace text. |
| `mapping` | `string` | Contents of a ProGuard/R8 mapping file. |

Returns: `string` — the deobfuscated stack trace.

## Examples

### Retrace a stack trace from a file

```ts
import { readFileSync } from 'node:fs';
import { retrace } from '@ctalau/offguard';

const stackTrace = readFileSync('stacktrace.txt', 'utf8');
const mapping = readFileSync('mapping.txt', 'utf8');

const result = retrace(stackTrace, mapping);
console.log(result);
```

## Playground (React demo)

This repo includes a small React app in `demo/` for trying the retrace API with either
custom inputs or preloaded fixtures. The published npm package remains unchanged because
the npm `files` list only includes `dist/`.

### Run locally

```bash
cd demo
npm install
npm run dev
```

### Deploy to Vercel

1. Create a new Vercel project and point it at this repository.
2. Set the **Root Directory** to `demo`.
3. Use the default Vite settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Deploy.

## Development

This project is developed with comprehensive test coverage based on R8 test cases.

### Project Structure

```
/src
  /core          # Core retrace logic
  /types         # TypeScript type definitions
  /fixtures      # Test data (obfuscated stacks, mappings)
  /tests         # Unit tests
```

### Scripts

- `npm run build` - Build the project
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run format` - Format code
- `npm run typecheck` - Type check code

### Adding fixtures, syncing Java retrace output, and bumping versions

1. **Capture Java retrace output** for the new scenario using the Java test harness:
   - Create/collect the mapping and stack trace files.
   - Run `cd java-tests && gradle runExample --args "<mapping> <stacktrace>"` to get the ProGuard output.
2. **Add a fixture** in `src/fixtures/xml/` using the Java output for `<retraced>` (and `<retracedVerbose>` if needed).
   - Update the fixture count in `src/tests/retrace.test.ts` after adding a new XML file.
3. **Align the TypeScript retrace behavior** with the Java output.
   - Run `npm test` to confirm the new fixture passes.
4. **Update the Java sources** when the upstream ProGuard implementation changes:
   - Run `./scripts/download-proguard-sources.sh` to refresh `proguard-sources/`.
5. **Bump the project version** in `package.json` and `package-lock.json` after behavior changes or new fixtures.

## License

MIT
