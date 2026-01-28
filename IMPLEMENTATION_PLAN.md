# ProGuard Retrace JS Port - Implementation Plan

## Project Overview
Port the ProGuard retrace tool from Java to JavaScript/TypeScript, with comprehensive test coverage based on R8 test cases. The tool will be available as an npm package and published to GitHub registry via GitHub Actions.

## Phase 1: Test Data Collection & Setup

### 1.1 Repository Structure Setup
- [ ] Initialize npm project with TypeScript
- [ ] Setup testing framework (Jest or Vitest)
- [ ] Configure build tooling (tsup or rollup)
- [ ] Setup linting and formatting (ESLint, Prettier)
- [ ] Create directory structure:
  ```
  /src
    /core          # Core retrace logic
    /parser        # Stack trace & mapping parsers
    /types         # TypeScript type definitions
    /cli           # CLI interface
  /tests
    /fixtures      # Test data (obfuscated stacks, mappings)
    /unit          # Unit tests
    /integration   # Integration tests
  /docs            # Documentation
  ```

### 1.2 Collect Test Samples from R8
- [ ] Clone/download R8 repository test cases from:
  - `https://r8.googlesource.com/r8/+/234408b2c185fa4a221d8faf59811822ab65128d/src/test/java/com/android/tools/r8/retrace/stacktraces/`
- [ ] Extract inline test examples from:
  - `RetraceRegularExpressionTests.java`
  - Other test files containing `StackTraceForTest` examples
- [ ] Download mapping samples from:
  - `third_party/r8mappings.tar.gz` (via Google Storage)

### 1.3 Create Test Triples
- [ ] Parse Java test files to extract:
  - Obfuscated stack traces
  - Mapping files
  - Expected deobfuscated output
- [ ] Create structured test fixtures in JSON format:
  ```json
  {
    "testName": "...",
    "obfuscatedStack": "...",
    "mapping": "...",
    "expectedDeobfuscated": "..."
  }
  ```
- [ ] Organize by test category (minimum 100+ test cases)
- [ ] Create test helper utilities to load and run test triples

## Phase 2: Core Retrace Logic Implementation (TDD)

### 2.1 Mapping File Parser
**Test First, Then Implement:**
- [ ] Write tests for ProGuard mapping format parsing
- [ ] Implement mapping file parser:
  - Parse class mappings: `original.class.Name -> a:`
  - Parse method mappings with line numbers: `int method() -> a`
  - Parse field mappings
  - Handle inline frame information
  - Support for R8 extensions

### 2.2 Stack Trace Parser
**Test First, Then Implement:**
- [ ] Write tests for various stack trace formats:
  - Java stack traces
  - Android stack traces
  - Different format variations
- [ ] Implement stack trace parser:
  - Extract class names, method names, line numbers
  - Handle different stack trace formats
  - Support for nested/caused by traces

### 2.3 Retrace Engine
**Test First, Then Implement:**
- [ ] Write tests for retrace logic:
  - Simple class/method deobfuscation
  - Line number remapping
  - Handling ambiguous mappings
  - Inline method reconstruction
  - Edge cases (missing mappings, invalid input)
- [ ] Implement retrace engine:
  - Map obfuscated names to original names
  - Resolve line numbers using mapping ranges
  - Handle multiple possible deobfuscations
  - Reconstruct inline frames
  - Format output

### 2.4 Source Code Analysis (Port from ProGuard)
**Reference:** `https://github.com/Guardsquare/proguard/tree/master/retrace`

Key files to port:
- [ ] `ReTrace.java` - Main entry point
- [ ] `MappingReader.java` - Mapping file reader
- [ ] `MappingProcessor.java` - Processing logic
- [ ] `FrameRemapper.java` - Frame remapping
- [ ] Related utility classes

Port strategy:
- Start with interfaces and type definitions
- Port utility functions
- Port core algorithms
- Adapt Java patterns to JavaScript/TypeScript idioms
- Maintain algorithmic correctness while using JS best practices

## Phase 3: Test Implementation & Validation

### 3.1 Unit Tests
- [ ] Test mapping parser with various formats
- [ ] Test stack trace parser with different formats
- [ ] Test retrace engine with simple cases
- [ ] Test edge cases and error handling
- [ ] Achieve >90% code coverage

### 3.2 Integration Tests
- [ ] Run all R8 test case triples
- [ ] Validate output matches expected deobfuscated traces
- [ ] Test with real-world mapping files
- [ ] Performance benchmarks
- [ ] Target: 100+ passing tests

### 3.3 Fix Failing Tests
- [ ] Debug and fix any test failures
- [ ] Refine edge case handling
- [ ] Ensure compatibility with ProGuard and R8 formats

## Phase 4: CLI & API Design

### 4.1 Programmatic API
- [ ] Design clean TypeScript API:
  ```typescript
  import { retrace } from 'offguard';

  const result = retrace({
    mapping: mappingContent,
    stackTrace: obfuscatedStack
  });
  ```
- [ ] Support streaming for large inputs
- [ ] Provide both sync and async APIs
- [ ] Export types for TypeScript users

### 4.2 CLI Interface
- [ ] Implement command-line interface:
  ```bash
  offguard -m mapping.txt -s stacktrace.txt
  offguard -m mapping.txt < stacktrace.txt
  ```
- [ ] Support stdin/stdout piping
- [ ] Add options for verbosity, format, etc.
- [ ] Provide help and version commands

## Phase 5: Documentation

### 5.1 Code Documentation
- [ ] Add JSDoc comments to all public APIs
- [ ] Document types and interfaces
- [ ] Add inline comments for complex logic

### 5.2 User Documentation
- [ ] Create comprehensive README.md:
  - Installation instructions
  - Quick start guide
  - API reference
  - CLI usage
  - Examples
- [ ] Create CONTRIBUTING.md
- [ ] Create CHANGELOG.md
- [ ] Add usage examples in `/examples` directory

### 5.3 API Documentation Site (Optional)
- [ ] Generate API docs with TypeDoc
- [ ] Deploy to GitHub Pages

## Phase 6: NPM Package Configuration

### 6.1 Package.json Setup
- [ ] Configure package metadata:
  - Name: `offguard` (or `@your-org/offguard`)
  - Version: Start at 0.1.0
  - Description, keywords, license
  - Repository, bugs, homepage URLs
- [ ] Define exports (dual ESM/CJS):
  ```json
  {
    "exports": {
      ".": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs",
        "types": "./dist/index.d.ts"
      }
    },
    "bin": {
      "offguard": "./dist/cli.js"
    }
  }
  ```
- [ ] Configure build scripts
- [ ] Add prepublishOnly script for validation

### 6.2 Build Configuration
- [ ] Setup TypeScript compilation with proper targets
- [ ] Configure bundler (tsup/rollup) for:
  - ESM output
  - CommonJS output
  - Type declarations
  - CLI executable
  - Minification
- [ ] Test package locally with `npm link`
- [ ] Validate package contents with `npm pack`

### 6.3 Package Quality
- [ ] Add npm badges to README
- [ ] Include LICENSE file
- [ ] Add .npmignore to exclude unnecessary files
- [ ] Ensure tree-shakeable exports

## Phase 7: GitHub Actions CI/CD

### 7.1 CI Workflow
Create `.github/workflows/ci.yml`:
- [ ] Run on: push, pull_request
- [ ] Jobs:
  - Lint and format check
  - Type checking
  - Run test suite
  - Build package
  - Test package installation
- [ ] Matrix testing (Node 18, 20, 22)

### 7.2 Release & Publish Workflow
Create `.github/workflows/publish.yml`:
- [ ] Trigger: on tag push (v*.*.*)
- [ ] Jobs:
  - Run full CI suite
  - Build package
  - Publish to GitHub Package Registry
  - Create GitHub release with changelog
- [ ] Configure npm authentication with GitHub token

### 7.3 GitHub Package Registry Setup
- [ ] Create `.npmrc` for GitHub registry:
  ```
  @your-scope:registry=https://npm.pkg.github.com
  ```
- [ ] Configure package.json with proper scope/name
- [ ] Document authentication for users
- [ ] Add registry badge to README

## Phase 8: Final Testing & Release

### 8.1 Pre-Release Validation
- [ ] Full test suite passes (100+ tests)
- [ ] Package builds successfully
- [ ] CLI works correctly
- [ ] Documentation is complete
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Performance is acceptable

### 8.2 Initial Release
- [ ] Tag version 0.1.0
- [ ] Trigger publish workflow
- [ ] Verify package on GitHub registry
- [ ] Test installation from registry
- [ ] Announce initial release

### 8.3 Post-Release
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Plan future improvements

## Success Criteria

1. **Functionality**: Successfully deobfuscates ProGuard/R8 obfuscated stack traces
2. **Testing**: 100+ passing tests with >90% coverage
3. **Compatibility**: Works with both ProGuard and R8 mapping formats
4. **Usability**: Clean API and CLI interface
5. **Documentation**: Comprehensive docs for users and contributors
6. **Distribution**: Published to GitHub registry via automated workflow
7. **Quality**: Passes linting, type checking, and all tests in CI

## Technical Stack

- **Language**: TypeScript
- **Testing**: Jest or Vitest
- **Build**: tsup or rollup
- **Linting**: ESLint + Prettier
- **CI/CD**: GitHub Actions
- **Registry**: GitHub Package Registry
- **Node**: Support 18+ (LTS versions)

## Timeline Estimates

- Phase 1: Test Data Collection - Foundation work
- Phase 2: Core Implementation - Main development effort
- Phase 3: Test Validation - Critical quality phase
- Phase 4: CLI/API - Interface polish
- Phase 5: Documentation - User experience
- Phase 6: NPM Package - Distribution setup
- Phase 7: GitHub Actions - Automation
- Phase 8: Release - Final validation

## Notes

- Use TDD throughout: Write tests first, then implement
- Start with simplest cases, gradually add complexity
- Keep commits atomic and well-documented
- Regular testing against R8 test suite
- Prioritize correctness over performance initially
- Consider adding benchmarks for performance tracking
