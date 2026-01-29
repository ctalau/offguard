# Java Tests for ProGuard Retrace

This directory contains tests that verify the official ProGuard retrace implementation against XML fixture files.

## Prerequisites

- Java 11 or higher
- Gradle 8.x (available globally or via wrapper)

## Directory Structure

```
java-tests/
├── build.gradle              # Gradle build configuration
├── src/
│   └── main/java/
│       └── com/offguard/
│           ├── ExampleMain.java        # Example-based retrace runner
│           ├── SimpleXmlParser.java    # XML fixture parser (no external deps)
│           ├── TestRunner.java         # Standalone test runner
│           └── RetraceTestRunner.java  # Alternative runner
│   └── test/java/
│       └── com/offguard/
│           └── RetraceFixtureTest.java # JUnit tests (optional)
├── TEST_RESULTS.md           # Summary of test results
├── PROGUARD_TEST_ANALYSIS.md # Detailed analysis of failures
└── README.md                 # This file
```

## ProGuard Sources

The test runner uses official ProGuard sources located in `../proguard-sources/`:

```
proguard-sources/
├── retrace/              # Core retrace implementation
│   ├── ReTrace.java
│   ├── FrameInfo.java
│   ├── FramePattern.java
│   └── FrameRemapper.java
├── obfuscate/            # Mapping file parser
│   ├── MappingReader.java
│   └── MappingProcessor.java
└── classfile/util/       # Utility classes
    └── ClassUtil.java
```

These sources are committed to the repository for reproducibility. To refresh them from the official ProGuard repository:

```bash
./scripts/download-proguard-sources.sh
```

## Running Tests

### Quick Start

```bash
cd java-tests
gradle runTests
```

### Run the README example in Java

```bash
cd java-tests
gradle runExample --args "<path-to-mapping> <path-to-stacktrace>"
```

### Expected Output

```
Running 66 tests...

PASS: ClassWithDashStackTrace
FAIL: AmbiguousInlineFramesStackTrace
... (more tests)

============================================================
TEST SUMMARY
============================================================
Passed: 16
Failed: 50
Total:  66
============================================================
```

### Understanding Test Results

**16 tests pass** - These fixtures correctly match ProGuard's behavior.

**50 tests fail** - These fixtures were designed for R8 (Android's obfuscation tool) which has different behavior than ProGuard. See `PROGUARD_TEST_ANALYSIS.md` for details.

## Fixture Format

Test fixtures are XML files in `../src/fixtures/xml/`:

```xml
<test name="TestName" expectedWarnings="0">
  <obfuscated>
    <line>at a.a.a(Unknown Source)</line>
  </obfuscated>
  <mapping>
    <line>com.example.Foo -&gt; a.a:</line>
    <line>    void bar() -&gt; a</line>
  </mapping>
  <retraced>
    <line>at com.example.Foo.bar(Unknown Source)</line>
  </retraced>
</test>
```

## No External Dependencies

This test suite requires **no external Maven/Gradle dependencies**:
- XML parsing uses built-in `SimpleXmlParser`
- Test runner uses standard Java assertions
- ProGuard sources are bundled

This ensures tests work in environments with restricted network access.

## Troubleshooting

### Build fails with compilation errors
Ensure `../proguard-sources/` contains all required files. Run `./scripts/download-proguard-sources.sh` to refresh.

### Tests fail unexpectedly
Check that you're in the `java-tests/` directory when running `gradle runTests`.

### Gradle not found
Install Gradle globally or use: `gradle wrapper && ./gradlew runTests`
