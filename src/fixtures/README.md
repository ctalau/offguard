# Test Fixtures from R8 Repository

This directory contains test fixtures collected from the R8 project's retrace test suite.

## Source

All files were extracted from:
- Repository: `https://r8.googlesource.com/r8`
- Directory: `src/test/java/com/android/tools/r8/retrace/stacktraces/`

## Structure

Each test file implements the `StackTraceForTest` interface, which provides:

1. **obfuscatedStackTrace()** - Stack trace with obfuscated class/method names
2. **mapping()** - ProGuard/R8 mapping file content
3. **retracedStackTrace()** - Expected deobfuscated stack trace output
4. **retraceVerboseStackTrace()** - Expected verbose mode output
5. **expectedWarnings()** - Number of warnings expected during retracing

## Test Coverage

- **72 test files** covering various scenarios:
  - Inline methods
  - Ambiguous mappings
  - Multiple line numbers
  - Source file handling
  - Exception messages
  - Special characters in file names
  - Named modules
  - Circular references
  - And many more edge cases

## Special Files

- **StackTraceForTest.java** - Interface definition for all test files
- **StackTraceRegularExpressionParserTests.java** - Contains inline test examples with custom regex patterns

## Usage

These files will be used in Phase 1.3 to create structured test triples (obfuscated input, mapping, expected output) that will drive our TypeScript implementation.
