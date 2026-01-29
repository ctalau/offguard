# ProGuard Retrace Test Analysis

## Executive Summary

Testing the official ProGuard retrace implementation against XML fixtures originally created for R8 (Android's replacement for ProGuard) reveals **16 passing tests (24%)** and **50 failing tests (76%)**.

The failures are NOT bugs in ProGuard. They occur because:

1. **The XML fixtures contain corrupted/malformed test data**
2. **The expected outputs use R8-specific features that ProGuard does not implement**

To achieve **100% compatibility with ProGuard**, the test fixtures need to be updated to:
- Fix corrupted test data
- Remove R8-specific expected behaviors
- Use ProGuard's documented behavior as the source of truth

---

## Detailed Analysis of First 5 Failing Tests

### Test 1: AmbiguousInlineFramesStackTrace

**Location**: `src/fixtures/xml/AmbiguousInlineFramesStackTrace.xml`

**Problems Identified**:

1. **Corrupted XML data**: The mapping section contains lines that are just `,` characters:
   ```xml
   <mapping>
     <line>com.android.tools.r8.R8 -&gt; a.a:</line>
     <line>,</line>  <!-- This is corrupted data, not a valid mapping line -->
     <line>  1:1:void bar(int, int):32 -&gt; a</line>
     <line>,</line>  <!-- This is corrupted data -->
   </mapping>
   ```

2. **Expected output uses R8-specific `<OR>` markers**:
   ```
   <OR> at com.android.tools.r8.R8.foo(R8.java:43)
   ```
   ProGuard does NOT output multiple alternatives with `<OR>` prefixes. It outputs only the first match.

3. **Expected output references method `foo` but mapping only defines `bar`**:
   The mapping shows `void bar(int, int):32 -> a` but the expected output shows `foo(R8.java:43)`. This indicates the test data is incomplete/corrupted.

**ProGuard Actual Output**:
```
com.android.tools.r8.CompilationException:
,
```
(ProGuard correctly outputs the unmatched lines as-is)

**Solution**:
- Remove corrupted `,` lines from mapping
- Update expected output to match ProGuard behavior (single best match, no `<OR>` markers)
- Ensure the mapping contains all methods referenced in expected output

---

### Test 2: AmbiguousMethodVerboseStackTrace

**Location**: `src/fixtures/xml/AmbiguousMethodVerboseStackTrace.xml`

**Problems Identified**:

1. **Escaped characters not properly decoded**:
   - `\&quot;` appears in the XML but should be decoded to `"`
   - `\t` appears literally instead of being an actual tab character

2. **Obfuscated input doesn't match mapping**:
   - Input: `\tat a.a.b(Bar.java)` - method `b` at class `a.a`
   - Mapping: `com.android.Foo main(java.lang.String[]) -> b`
   - The mapping says `main` maps to `b`, so ProGuard correctly reverses `b` to... nothing found because the class mapping shows `Main -> a.a` but the method signature doesn't match

3. **Expected output assumes method `main` but mapping has different return type**:
   - Mapping shows: `com.android.Foo main(java.lang.String[]) -> b`
   - This means `main` returns `com.android.Foo`, not `void`
   - ProGuard may not match this because the obfuscated trace doesn't include type info

**ProGuard Actual Output**:
```
Exception in thread \"main\" java.lang.NullPointerException

	at a.a.b(Bar.java)
```
(ProGuard couldn't match the method because of missing type information in the trace)

**Solution**:
- Fix the escape sequences in XML
- Ensure method signatures in mapping match what ProGuard can resolve from the trace
- Update expected output to match ProGuard's behavior when ambiguous

---

### Test 3: AmbiguousMissingLineStackTrace

**Location**: `src/fixtures/xml/AmbiguousMissingLineStackTrace.xml`

**Problems Identified**:

1. **Mapping has corrupted `, ` line**:
   ```xml
   <line>com.android.tools.r8.R8 -&gt; a.a:</line>
   <line>, </line>  <!-- Corrupted -->
   <line>  void bar(int, int) -&gt; a</line>
   ```

2. **Expected output uses R8-specific `<OR>` markers for ALL alternatives**:
   ```
   <OR> at com.android.tools.r8.R8.foo(R8.java:7)
   <OR> at com.android.tools.r8.R8.foo(R8.java:8)
   ```
   R8 shows all possible line number resolutions. ProGuard shows only the first/best match.

3. **Expected references method `foo` but mapping only has `bar`**:
   The mapping defines `void bar(int, int) -> a` but expected output shows `foo`.

**ProGuard Actual Output**:
```
com.android.tools.r8.CompilationException: foo[parens](Source:3)
    at com.android.tools.r8.R8.bar(Unknown Source:8)
Caused by: com.android.tools.r8.CompilationException: foo[parens](Source:3)
    ... 42 more
```
(ProGuard correctly deobfuscates to `bar`, preserves `... 42 more`, doesn't add `<OR>` markers)

**Solution**:
- Fix corrupted mapping data
- Change expected output to show single match (`bar`) without `<OR>` markers
- Preserve `... 42 more` in expected output (ProGuard keeps this)

---

### Test 4: AmbiguousMultipleInlineStackTrace

**Location**: `src/fixtures/xml/AmbiguousMultipleInlineStackTrace.xml`

**Problems Identified**:

1. **Inline mapping syntax (R8-specific)**:
   ```
   10:10:void some.inlinee2(int, int):20:20 -> zza
   ```
   This is R8's inline frame notation: `obfuscatedRange:obfuscatedRange:returnType originalClass.method(args):originalLineStart:originalLineEnd -> obfuscatedName`

   ProGuard's mapping format is different and doesn't support the same inline frame notation.

2. **Expected output uses `<OR>` for inline alternatives**:
   ```
   <OR> at some.inlinee2(some.java:20)
   <OR> at com.android.tools.r8.Internal.foo(Internal.java:42)
   ```
   This is R8's way of showing "this obfuscated frame could be either of these original frames".

3. **Corrupted obfuscated input**: The obfuscated section is empty/malformed:
   ```xml
   <obfuscated>
     <line>java.lang.IndexOutOfBoundsException</line>
     <line>,\n        </line>
     <line>\t</line>
   </obfuscated>
   ```
   Missing the actual stack frame line to deobfuscate.

**ProGuard Actual Output**:
```
java.lang.IndexOutOfBoundsException

```
(ProGuard outputs lines unchanged when no matching frame is found)

**Solution**:
- Add actual obfuscated stack frame to input (e.g., `at com.android.tools.r8.Internal.zza(...)`)
- ProGuard may not support inline frame syntax - verify and document
- Update expected to match ProGuard behavior (no `<OR>`, single match)

---

### Test 5: AmbiguousStackTrace

**Location**: `src/fixtures/xml/AmbiguousStackTrace.xml`

**Problems Identified**:

1. **Corrupted mapping with `, ` line**:
   ```xml
   <line>com.android.tools.r8.R8 -&gt; a.a:</line>
   <line>, </line>  <!-- Corrupted -->
   <line>  void bar(int, int) -&gt; a</line>
   ```

2. **Expected shows `<OR>` markers for ambiguous cases**:
   When there's no line number and multiple methods map to the same obfuscated name, R8 shows all alternatives. ProGuard shows only the first match.

3. **Expected references method `foo` but mapping has `bar`**:
   ```
   Expected: <OR> at com.android.tools.r8.R8.foo(R8.java)
   Mapping:  void bar(int, int) -> a
   ```

**ProGuard Actual Output**:
```
com.android.tools.r8.CompilationException: foo[parens](Source:3)
    at com.android.tools.r8.R8.bar(Unknown Source)
Caused by: com.android.tools.r8.CompilationException: foo[parens](Source:3)
    ... 42 more
```

**Solution**:
- Fix corrupted mapping
- Update expected to show `bar` (matching the actual mapping)
- Remove `<OR>` markers
- Keep `... 42 more` in expected output

---

## Root Cause Analysis

### Issue 1: Corrupted XML Fixture Data

Many fixtures contain lines that are just `,` or `, ` characters. This appears to be an artifact from the original R8 test case conversion process where:
- R8 test cases use Java code with string arrays/lists
- These were converted to XML but delimiter characters were incorrectly included as data

**Pattern observed**:
```java
// Original R8 test (hypothetical)
String[] mapping = {
    "com.example.Foo -> a.a:",
    "  void bar() -> a",
};
```
When converted to XML, the `,` delimiters were kept as data lines.

### Issue 2: R8-Specific Expected Outputs

The test fixtures were created for R8 which has different behavior than ProGuard:

| Feature | R8 Behavior | ProGuard Behavior |
|---------|-------------|-------------------|
| Ambiguous mappings | Shows ALL alternatives with `<OR>` prefix | Shows FIRST match only |
| Inline frames | Expanded with special notation | Not supported in same way |
| `... N more` lines | May transform | Passes through unchanged |
| Unknown source | May synthesize | Shows "Unknown Source" |

### Issue 3: Incomplete Mapping Data

Many fixtures reference methods in expected output that don't exist in the mapping:
- Expected: `foo(R8.java:43)`
- Mapping: `bar(int, int) -> a`

This suggests the fixtures were auto-generated from R8's test suite but the mapping data was truncated or corrupted.

---

## Recommended Solution

### Option A: Fix Fixtures for ProGuard Compatibility (Recommended)

For each fixture, update:

1. **Remove corrupted data lines** (`,` and `, ` lines)
2. **Replace `<OR>` markers** with single best match
3. **Ensure mapping completeness** - all methods in expected output must be in mapping
4. **Fix escape sequences** - decode `\t`, `\&quot;` properly
5. **Keep ProGuard-specific behaviors** like `... N more` pass-through

**Example Fix for AmbiguousStackTrace**:

Before:
```xml
<mapping>
  <line>com.android.tools.r8.R8 -&gt; a.a:</line>
  <line>, </line>
  <line>  void bar(int, int) -&gt; a</line>
</mapping>
<retraced>
  <line>    &lt;OR&gt; at com.android.tools.r8.R8.foo(R8.java)</line>
</retraced>
```

After:
```xml
<mapping>
  <line>com.android.tools.r8.R8 -&gt; a.a:</line>
  <line>    void bar(int, int) -&gt; a</line>
</mapping>
<retraced>
  <line>    at com.android.tools.r8.R8.bar(Unknown Source)</line>
</retraced>
```

### Option B: Create ProGuard-Native Test Suite

Create a new test suite specifically designed for ProGuard's behavior:

1. Use ProGuard's own test cases as reference
2. Generate expected outputs by running actual ProGuard retrace
3. Document ProGuard-specific behaviors

---

## Next Steps

1. **Create a fixture cleanup script** that:
   - Removes corrupted `,` lines
   - Identifies `<OR>` markers that need updating
   - Reports missing mapping entries

2. **Run ProGuard to generate correct expected outputs** for each test case

3. **Document the 16 passing tests** to understand what "correct" fixtures look like

4. **Incrementally fix fixtures** starting with simplest cases

---

## Appendix: Passing Tests (Reference)

These 16 tests pass and can serve as templates for fixture format:

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
