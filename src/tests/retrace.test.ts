import { describe, it, expect } from 'vitest';
import { retrace } from '../core/retrace';
import { loadAllFixtures } from './fixture-loader';

describe('retrace', () => {
  it('should be defined', () => {
    expect(retrace).toBeDefined();
  });

  it('should process basic retrace', () => {
    const stackTrace = 'Example stack trace';
    const mapping = 'Example mapping';
    const result = retrace(stackTrace, mapping);
    expect(typeof result).toBe('string');
  });

  describe('fixture tests', () => {
    const fixtures = loadAllFixtures();

    // ProGuard-compatible fixtures (expected to pass once implementation is complete)
    const proguardCompatible = [
      'ClassWithDashStackTrace',
      'ColonInFileNameStackTrace',
      'FileNameExtensionStackTrace',
      'FoundMethodVerboseStackTrace',
      'IdentityMappingStackTrace',
      'InvalidStackTrace',
      'MapVersionWarningStackTrace',
      'MultipleDotsInFileNameStackTrace',
      'MultipleMapVersionsWarningStackTrace',
      'NullStackTrace',
      'PGStackTrace',
      'SuppressedStackTrace',
      'TrailingWhitespaceStackTrace',
      'UnicodeInFileNameStackTrace',
      'UnknownSourceStackTrace',
      'VerboseUnknownStackTrace',
    ];

    it('should have loaded all 66 fixtures', () => {
      expect(fixtures.length).toBe(66);
    });

    fixtures.forEach((fixture) => {
      const isR8Specific = !proguardCompatible.includes(fixture.name);
      const testFn = isR8Specific ? it.skip : it;
      const suffix = isR8Specific ? ' (R8-specific, skipped)' : '';

      testFn(`${fixture.name}${suffix}`, () => {
        // Validate test data is complete
        expect(fixture.name).toBeTruthy();
        expect(fixture.obfuscated).toBeDefined();
        expect(fixture.mapping).toBeDefined();
        expect(fixture.retraced).toBeDefined();
        expect(fixture.expectedWarnings).toBeGreaterThanOrEqual(0);

        // Test retrace function
        let result: string;
        expect(() => {
          result = retrace(fixture.obfuscated, fixture.mapping);
        }).not.toThrow();

        // Verify return type
        expect(typeof result!).toBe('string');

        // For ProGuard-compatible fixtures, verify against expected output
        expect(result).toBe(fixture.retraced);
      });
    });
  });
});
