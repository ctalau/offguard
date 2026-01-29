# Follow-Up Task: Update Test Fixtures for ProGuard Compatibility

## Overview

The XML test fixtures in `src/fixtures/xml/` were originally created for R8 (Android's obfuscation tool). To achieve **100% compatibility with ProGuard**, these fixtures need to be updated to match ProGuard's actual behavior.

**Current Status**: 16 passing, 50 failing (out of 66 tests)

## Problem Summary

The test failures fall into three categories:

| Category | Description | Example |
|----------|-------------|---------|
| **Corrupted Data** | Mapping sections contain spurious `,` or `, ` lines | `<line>, </line>` |
| **R8-Specific Output** | Expected output uses `<OR>` markers for ambiguous cases | `<OR> at Foo.bar()` |
| **Missing Mappings** | Expected output references methods not in mapping | Expected `foo()` but mapping has `bar()` |

## Proposed Solution

### Step 1: Run Tests to Identify Failures

```bash
cd java-tests
gradle runTests 2>&1 | tee test-output.txt
```

This outputs detailed failure information including:
- Expected output (from fixture)
- Actual output (from ProGuard)
- Mapping used

### Step 2: For Each Failing Test

#### 2.1 Fix Corrupted Mapping Data

Remove lines that are just delimiters:

**Before:**
```xml
<mapping>
  <line>com.example.Foo -&gt; a.a:</line>
  <line>, </line>  <!-- REMOVE THIS -->
  <line>    void bar() -&gt; a</line>
</mapping>
```

**After:**
```xml
<mapping>
  <line>com.example.Foo -&gt; a.a:</line>
  <line>    void bar() -&gt; a</line>
</mapping>
```

#### 2.2 Replace `<OR>` Markers with Single Match

ProGuard outputs only the first/best match, not all alternatives.

**Before (R8 style):**
```xml
<retraced>
  <line>    &lt;OR&gt; at com.example.Foo.bar(Foo.java:10)</line>
  <line>    &lt;OR&gt; at com.example.Foo.bar(Foo.java:20)</line>
</retraced>
```

**After (ProGuard style):**
```xml
<retraced>
  <line>    at com.example.Foo.bar(Foo.java:10)</line>
</retraced>
```

#### 2.3 Use ProGuard's Actual Output as Expected

Run the test and copy ProGuard's actual output to the expected section:

```bash
# Run single test and capture output
gradle runTests 2>&1 | grep -A 50 "=== FAILURE: TestName ===" | head -60
```

The "Actual:" section shows what ProGuard produces - use this as the new expected value.

#### 2.4 Fix Escape Sequences

Some fixtures have incorrectly encoded escape sequences:

| Wrong | Correct |
|-------|---------|
| `\t` (literal) | Actual tab character |
| `\&quot;` | `"` or `&quot;` |
| `\n` (literal) | Actual newline |

### Step 3: Verify Fix

After updating a fixture, run tests again:

```bash
gradle runTests 2>&1 | grep "TestName"
```

Should show `PASS: TestName`.

## Automation Script (Optional)

Create a script to help identify issues:

```bash
#!/bin/bash
# scripts/analyze-fixtures.sh

echo "=== Fixtures with corrupted ',' lines ==="
grep -l "^<line>,.*</line>$" ../src/fixtures/xml/*.xml

echo ""
echo "=== Fixtures with <OR> markers ==="
grep -l "&lt;OR&gt;" ../src/fixtures/xml/*.xml

echo ""
echo "=== Summary ==="
echo "Total fixtures: $(ls ../src/fixtures/xml/*.xml | wc -l)"
echo "With ',' lines: $(grep -l "^<line>,.*</line>$" ../src/fixtures/xml/*.xml | wc -l)"
echo "With <OR> markers: $(grep -l "&lt;OR&gt;" ../src/fixtures/xml/*.xml | wc -l)"
```

## Running Tests

### Full Test Suite

```bash
cd java-tests
gradle runTests
```

### Understanding Output

```
Running 66 tests...

PASS: ClassWithDashStackTrace       # ✓ This test passes
FAIL: AmbiguousStackTrace           # ✗ This test fails - needs fixing

============================================================
TEST SUMMARY
============================================================
Passed: 16
Failed: 50
Total:  66
============================================================

FAILURE DETAILS:
=== FAILURE: AmbiguousStackTrace ===
Expected:                           # What the fixture expects
...
---
Actual:                             # What ProGuard actually outputs
...
---
Mapping:                            # The mapping file used
...
=== END AmbiguousStackTrace ===
```

### Confirming All Tests Pass

After fixing all fixtures:

```bash
gradle runTests 2>&1 | tail -10
```

Expected output when all pass:

```
============================================================
TEST SUMMARY
============================================================
Passed: 66
Failed: 0
Total:  66
============================================================
```

## Priority Order

Fix tests in this order (easiest to hardest):

### Priority 1: Simple Corrupted Data (15-20 tests)
Tests where only the `,` lines need removal:
- AmbiguousStackTrace
- AmbiguousMissingLineStackTrace
- UnknownSourceStackTrace

### Priority 2: `<OR>` Marker Removal (20-25 tests)
Tests that use R8's ambiguous output format:
- AmbiguousInlineFramesStackTrace
- AmbiguousMultipleInlineStackTrace
- AmbiguousWithSignatureStackTrace

### Priority 3: Complex Fixes (10-15 tests)
Tests requiring multiple changes or investigation:
- InlineWithLineNumbersStackTrace (R8 inline syntax)
- SyntheticLambdaMethodStackTrace (synthetic method handling)
- SourceFileNameSynthesizeStackTrace (filename synthesis)

## Reference: Passing Tests

These 16 tests already pass and can serve as templates:

1. ClassWithDashStackTrace
2. ExceptionMessageWithClassNameInMessage
3. InlineNoLineAssumeNoInlineAmbiguousStackTrace
4. InlineNoLineNumberAssumeNoInlineStackTrace
5. InlineNoLineWithBaseEntryNumberAssumeNoInlineStackTrace
6. InlinePreambleNoOriginalStackTrace
7. InvalidMinifiedRangeStackTrace
8. InvalidOriginalRangeStackTrace
9. InvalidStackTrace
10. LongLineStackTrace
11. ObfucatedExceptionClassStackTrace
12. OverloadedWithAndWithoutRangeStackTrace
13. PGStackTrace
14. SuppressedStackTrace
15. TrailingWhitespaceStackTrace
16. VerboseUnknownStackTrace

## Files to Update

```
src/fixtures/xml/
├── AmbiguousInlineFramesStackTrace.xml      # Needs fix
├── AmbiguousMethodVerboseStackTrace.xml     # Needs fix
├── AmbiguousMissingLineStackTrace.xml       # Needs fix
├── ... (47 more failing tests)
├── ClassWithDashStackTrace.xml              # ✓ Already passes
├── ... (15 more passing tests)
```

## Verification Checklist

- [ ] All 66 tests pass (`gradle runTests` shows 0 failures)
- [ ] No `<OR>` markers remain in expected outputs
- [ ] No corrupted `,` lines in mapping sections
- [ ] All escape sequences properly decoded
- [ ] Each fixture's expected output matches ProGuard's actual output
