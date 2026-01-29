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

## License

MIT
