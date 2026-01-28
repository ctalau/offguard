# @ctalau/offguard

TypeScript port of the ProGuard retrace tool for deobfuscating stack traces.

## Status

🚧 **Work in Progress** - This library is currently under active development.

## Overview

This project aims to provide a TypeScript/JavaScript implementation of the ProGuard retrace tool, which is used to deobfuscate stack traces from Android applications that have been obfuscated with ProGuard or R8.

## Development

This project is being developed with comprehensive test coverage based on R8 test cases.

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
