# ProGuard Retrace JS Port - Implementation Plan

## Project Overview
Port the ProGuard retrace tool from Java to TypeScript, with comprehensive test coverage based on R8 test cases. The tool will be available as an npm package and published to npm ass @ctalau/offguard.

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
- [ ] Create structured test fixtures in XML format (name, obfuscated stack, mapping, deobfuscated stack)

## 2 Bring the Proguard code 

**Reference:** `https://github.com/Guardsquare/proguard/tree/master/retrace`

Create kotlin tests based on the xml files with the official implememtation. If tests do not work well, update tests.

## Phase 3: create TS tests 

From the same data

## Phase 4: create the ts port

## Phase 4: API Design

- idiomatic TS API


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


## Phase 6: NPM Package Configuration

### 6.1 Package.json Setup
- [ ] Configure package metadata:
  - Name: `offguard` (or `@y/offguard`)
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
  - Minification
- [ ] Validate package contents with `npm pack`

### 6.3 Package Quality
- [ ] Add npm badges to README
- [ ] Include LICENSE file
- [ ] Add .npmignore to exclude unnecessary files

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

### 7.2 Release & Publish Workflow



## Success Criteria

1. **Functionality**: Successfully deobfuscates ProGuard/R8 obfuscated stack traces
2. **Testing**: 100+ passing tests with >90% coverage
4. **Usability**: Clean API interface
5. **Documentation**: Comprehensive docs for users and contributors
6. **Distribution**: Published to npm registry via automated workflow
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
- Consider adding benchmarks for performance
