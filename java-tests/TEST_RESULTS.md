# Java Test Results

## Summary

Tested 66 XML fixtures against the official ProGuard retrace implementation:
- **16 tests passed** (24%)
- **50 tests failed** (76%)

## Key Findings

The failures are **NOT bugs in ProGuard**. They occur because the XML fixtures were originally created for R8 (Android's D8/R8 compiler) which has different behavior than ProGuard.

### Why Tests Fail

1. **Corrupted fixture data**: Many XML files contain lines that are just `,` characters - artifacts from converting R8's Java test cases to XML format.

2. **R8-specific expected outputs**: The expected outputs use R8 features that ProGuard doesn't implement:
   - `<OR>` markers for showing all possible deobfuscation alternatives
   - Inline frame expansion notation
   - Different handling of ambiguous mappings

3. **Incomplete mapping data**: Expected outputs reference methods that don't exist in the mapping files.

### ProGuard vs R8 Behavioral Differences

| Feature | R8 Behavior | ProGuard Behavior |
|---------|-------------|-------------------|
| Ambiguous mappings | Shows ALL alternatives with `<OR>` prefix | Shows FIRST match only |
| Inline frames | Expanded with special notation | Basic support only |
| `... N more` lines | May transform | Passes through unchanged |
| Unknown source | May synthesize filename | Shows "Unknown Source" |

## Solution: Update Fixtures for ProGuard Compatibility

To achieve **100% compatibility with ProGuard**, each failing fixture needs:

1. **Remove corrupted `,` lines** from mapping sections
2. **Replace `<OR>` markers** with single best match
3. **Ensure mapping completeness** - add missing method entries
4. **Update expected outputs** to match ProGuard's documented behavior

See `PROGUARD_TEST_ANALYSIS.md` for detailed analysis of the first 5 failures.

## Passing Tests (Reference Implementation)

These 16 tests pass and demonstrate correct fixture format:

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

## Running Tests

```bash
# Download ProGuard sources (run once)
./scripts/download-proguard-sources.sh

# Run tests
cd java-tests
gradle runTests
```

## Next Steps

1. Fix corrupted fixture data (remove `,` lines)
2. Update expected outputs to match ProGuard behavior
3. Run ProGuard to verify expected outputs are correct
4. Document any ProGuard limitations vs R8 features
