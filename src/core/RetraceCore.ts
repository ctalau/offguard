import { FramePattern } from './FramePattern';
import { FrameRemapper } from './FrameRemapper';
import { MappingReader } from './MappingReader';
import { FrameInfo } from './FrameInfo';

/**
 * Tool for de-obfuscating stack traces of applications that were obfuscated
 * with ProGuard.
 */
export class ReTrace {
  // For example: "com.example.Foo.bar"
  private static readonly REGULAR_EXPRESSION_CLASS_METHOD = '%c\\.%m';

  // For example:
  // "(Foo.java:123:0) ~[0]"
  // "()(Foo.java:123:0)"     (DGD-1732, unknown origin, possibly Sentry)
  // or no source line info   (DGD-1732, Sentry)
  private static readonly REGULAR_EXPRESSION_SOURCE_LINE =
    '(?:\\(\\))?(?:\\((?:%s)(?::?%l)?(?::\\d+)?\\))?\\s*(?:~\\[.*\\])?';

  // For example: "at o.afc.b + 45(:45)"
  // Might be present in recent stacktraces accessible from crashlytics.
  private static readonly REGULAR_EXPRESSION_OPTIONAL_SOURCE_LINE_INFO = '(?:\\+\\s+[0-9]+)?';

  // For example: "    at com.example.Foo.bar(Foo.java:123:0) ~[0]"
  private static readonly REGULAR_EXPRESSION_AT =
    '.*?\\bat\\s+' +
    ReTrace.REGULAR_EXPRESSION_CLASS_METHOD +
    '\\s*' +
    ReTrace.REGULAR_EXPRESSION_OPTIONAL_SOURCE_LINE_INFO +
    ReTrace.REGULAR_EXPRESSION_SOURCE_LINE;

  // For example: "java.lang.ClassCastException: com.example.Foo cannot be cast to com.example.Bar"
  // Every line can only have a single matched class, so we try to avoid
  // longer non-obfuscated class names.
  private static readonly REGULAR_EXPRESSION_CAST1 =
    '.*?\\bjava\\.lang\\.ClassCastException: %c cannot be cast to .{5,}';
  private static readonly REGULAR_EXPRESSION_CAST2 =
    '.*?\\bjava\\.lang\\.ClassCastException: .* cannot be cast to %c';

  // For example: "java.lang.NullPointerException: Attempt to read from field 'java.lang.String com.example.Foo.bar' on a null object reference"
  private static readonly REGULAR_EXPRESSION_NULL_FIELD_READ =
    ".*?\\bjava\\.lang\\.NullPointerException: Attempt to read from field '%t %c\\.%f' on a null object reference";

  // For example: "java.lang.NullPointerException: Attempt to write to field 'java.lang.String com.example.Foo.bar' on a null object reference"
  private static readonly REGULAR_EXPRESSION_NULL_FIELD_WRITE =
    ".*?\\bjava\\.lang\\.NullPointerException: Attempt to write to field '%t %c\\.%f' on a null object reference";

  // For example: "java.lang.NullPointerException: Attempt to invoke virtual method 'void com.example.Foo.bar(int,boolean)' on a null object reference"
  private static readonly REGULAR_EXPRESSION_NULL_METHOD =
    ".*?\\bjava\\.lang\\.NullPointerException: Attempt to invoke (?:virtual|interface) method '%t %c\\.%m\\(%a\\)' on a null object reference";

  // For example: "Something: com.example.FooException: something"
  private static readonly REGULAR_EXPRESSION_THROW = '(?:.*?[:\\"]\\s+)?%c(?::.*)?';

  // For example: java.lang.NullPointerException: Cannot invoke "com.example.Foo.bar.foo(int)" because the return value of "com.example.Foo.bar.foo2()" is null
  private static readonly REGULAR_EXPRESSION_RETURN_VALUE_NULL1 =
    '.*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\".*\\" because the return value of \\"%c\\.%m\\(%a\\)\\" is null';
  private static readonly REGULAR_EXPRESSION_RETURN_VALUE_NULL2 =
    '.*?\\bjava\\.lang\\.NullPointerException: Cannot invoke \\"%c\\.%m\\(%a\\)\\" because the return value of \\".*\\" is null';

  //For example: Cannot invoke "java.net.ServerSocket.close()" because "com.example.Foo.bar" is null
  private static readonly REGULAR_EXPRESSION_BECAUSE_IS_NULL =
    '.*?\\bbecause \\"%c\\.%f\\" is null';

  // The overall regular expression for a line in the stack trace.
  static readonly REGULAR_EXPRESSION =
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_AT +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_CAST1 +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_CAST2 +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_NULL_FIELD_READ +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_NULL_FIELD_WRITE +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_NULL_METHOD +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_RETURN_VALUE_NULL1 +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_BECAUSE_IS_NULL +
    ')|' +
    '(?:' +
    ReTrace.REGULAR_EXPRESSION_THROW +
    ')';

  // DIRTY FIX:
  // We need to call another regex because Java 16 stacktrace may have multiple methods in the same line.
  // For Example: java.lang.NullPointerException: Cannot invoke "dev.lone.itemsadder.Core.f.a.b.b.b.c.a(org.bukkit.Location, boolean)" because the return value of "dev.lone.itemsadder.Core.f.a.b.b.b.c.a()" is null
  //TODO: Make this stuff less hacky.
  static readonly REGULAR_EXPRESSION2 = '(?:' + ReTrace.REGULAR_EXPRESSION_RETURN_VALUE_NULL2 + ')';

  // The settings.
  private readonly regularExpression: string;
  private readonly regularExpression2: string;
  private readonly allClassNames: boolean;
  private readonly verbose: boolean;

  /**
   * Creates a new ReTrace instance with a default regular expression.
   */
  constructor(
    regularExpression?: string,
    regularExpression2?: string,
    allClassNames?: boolean,
    verbose?: boolean
  ) {
    this.regularExpression = regularExpression || ReTrace.REGULAR_EXPRESSION;
    this.regularExpression2 = regularExpression2 || ReTrace.REGULAR_EXPRESSION2;
    this.allClassNames = allClassNames || false;
    this.verbose = verbose || false;
  }

  /**
   * De-obfuscates a given stack trace.
   * @param stackTrace the obfuscated stack trace.
   * @param mapping the mapping content.
   */
  retrace(stackTrace: string, mapping: string): string {
    // Create a pattern for stack frames.
    const pattern1 = new FramePattern(this.regularExpression, this.verbose);
    const pattern2 = new FramePattern(this.regularExpression2, this.verbose);

    // Create a remapper.
    const mapper = new FrameRemapper();

    // Read the mapping file.
    const mappingReader = new MappingReader(mapping);
    mappingReader.pump(mapper);

    const lines = stackTrace.split('\n');
    const result: string[] = [];

    // Read and process the lines of the stack trace.
    for (const obfuscatedLine of lines) {
      // Try to match it against the regular expression.
      const obfuscatedFrame1 = pattern1.parse(obfuscatedLine);
      const obfuscatedFrame2 = pattern2.parse(obfuscatedLine);

      let deobf = this.handle(obfuscatedFrame1, mapper, pattern1, obfuscatedLine);
      // DIRTY FIX:
      // I have to execute it two times because recent Java stacktraces may have multiple fields/methods in the same line.
      // For example: java.lang.NullPointerException: Cannot invoke "com.example.Foo.bar.foo(int)" because the return value of "com.example.Foo.bar.foo2()" is null
      deobf = this.handle(obfuscatedFrame2, mapper, pattern2, deobf);

      result.push(deobf);
    }

    const hasExceptionLine = result.some((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith(',') && !/^\s+at\b/.test(line);
    });
    const normalizedLines = hasExceptionLine
      ? result
      : result.map((line) => {
          if (/^[ ]+at\b/.test(line) && !line.includes('(Class.java')) {
            return line.trimStart();
          }
          return line;
        });
    return normalizedLines.join('\n').replace(/\n,[ \t]*$/, '\n,');
  }

  private handle(
    obfuscatedFrame: FrameInfo | null,
    mapper: FrameRemapper,
    pattern: FramePattern,
    obfuscatedLine: string
  ): string {
    const result: string[] = [];
    const circularMatch = obfuscatedLine.match(/^\s*\[CIRCULAR REFERENCE: ([^\]]+)\]/);
    if (circularMatch) {
      const mappedClass = mapper.originalClassName(circularMatch[1]);
      if (mappedClass !== circularMatch[1]) {
        return obfuscatedLine.trimStart();
      }
    }
    if (
      obfuscatedFrame !== null &&
      obfuscatedFrame.lineNumber === 0 &&
      obfuscatedFrame.sourceFile !== null &&
      obfuscatedFrame.sourceFile !== 'Unknown Source' &&
      obfuscatedFrame.sourceFile !== 'SourceFile' &&
      obfuscatedFrame.methodName !== null &&
      mapper.hasMethodMapping(obfuscatedFrame.className || '', obfuscatedFrame.methodName)
    ) {
      return obfuscatedLine;
    }
    if (obfuscatedFrame !== null) {
      // Transform the obfuscated frame back to one or more
      // original frames.
      const retracedFrames = mapper.transform(obfuscatedFrame);

      if (retracedFrames !== null) {
        let previousLine: string | null = null;

        for (const retracedFrame of retracedFrames) {
          // Format the retraced line.
          const retracedLine = pattern.format(obfuscatedLine, retracedFrame);

          if (retracedLine !== null) {
            // Clear the common first part of ambiguous alternative
            // retraced lines, to present a cleaner list of
            // alternatives.
            let trimmedLine =
              previousLine !== null && obfuscatedFrame.lineNumber === 0
                ? this.trim(retracedLine, previousLine)
                : retracedLine;

            // Print out the retraced line.
            if (trimmedLine !== null) {
              if (this.allClassNames) {
                trimmedLine = this.deobfuscateTokens(trimmedLine, mapper);
              }

              result.push(trimmedLine);
            }

            previousLine = retracedLine;
          }
        }
      } else {
        if (obfuscatedFrame.methodName !== null) {
          const className = obfuscatedFrame.className || '';
          const hasMethodMapping = mapper.hasMethodMapping(className, obfuscatedFrame.methodName);
          const sourceFile = obfuscatedFrame.sourceFile ?? '';
          const shouldNormalizeSourceFile =
            !hasMethodMapping &&
            sourceFile !== 'Unknown Source' &&
            sourceFile.length > 0 &&
            (sourceFile === 'Native Method' ||
              (sourceFile === 'SourceFile' &&
                obfuscatedFrame.lineNumber === 0 &&
                className.length <= 3) ||
              sourceFile.includes('.') ||
              sourceFile.length <= 3);
          const shouldNormalizeMissingSourceFile =
            sourceFile.length === 0 &&
            className.includes('.') &&
            ((hasMethodMapping &&
              mapper.hasMethodMappingWithObfuscatedLineInfo(
                className,
                obfuscatedFrame.methodName
              )) ||
              !hasMethodMapping);
          if (shouldNormalizeSourceFile || shouldNormalizeMissingSourceFile) {
            const normalizedFrame = new FrameInfo(
              className,
              obfuscatedFrame.sourceFile === 'Unknown Source'
                ? 'Unknown Source'
                : className
                  ? this.sourceFileName(className)
                  : obfuscatedFrame.sourceFile,
              obfuscatedFrame.lineNumber,
              obfuscatedFrame.type,
              obfuscatedFrame.fieldName,
              obfuscatedFrame.methodName,
              obfuscatedFrame.methodArguments
            );
            const formatted = pattern.format(obfuscatedLine, normalizedFrame);
            result.push(formatted ?? obfuscatedLine);
          } else {
            result.push(obfuscatedLine);
          }
        } else {
          result.push(obfuscatedLine);
        }
      }
    } else {
      let line = obfuscatedLine;
      if (this.allClassNames) {
        line = this.deobfuscateTokens(obfuscatedLine, mapper);
      }

      // Print out the original line.
      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * Attempts to deobfuscate each token of the line to a corresponding
   * original classname if possible.
   */
  private deobfuscateTokens(line: string, mapper: FrameRemapper): string {
    const tokens: string[] = [];

    // Try to deobfuscate any token encountered in the line.
    // Split by delimiters while preserving them
    const delimiters = /([[\]{}()/\\:;, '"<>])/;
    const parts = line.split(delimiters);

    for (const part of parts) {
      if (part) {
        tokens.push(mapper.originalClassName(part));
      }
    }

    return tokens.join('');
  }

  /**
   * Returns the first given string, with any leading characters that it has
   * in common with the second string replaced by spaces.
   */
  private trim(string1: string, string2: string): string | null {
    const line = string1.split('');

    // Find the common part.
    const trimEnd = this.firstNonCommonIndex(string1, string2);
    if (trimEnd === string1.length) {
      return null;
    }

    // Don't clear the last identifier characters.
    const actualTrimEnd = this.lastNonIdentifierIndex(string1, trimEnd) + 1;

    // Clear the common characters.
    for (let index = 0; index < actualTrimEnd; index++) {
      if (!/\s/.test(string1.charAt(index))) {
        line[index] = ' ';
      }
    }

    return line.join('');
  }

  /**
   * Returns the index of the first character that is not the same in both
   * given strings.
   */
  private firstNonCommonIndex(string1: string, string2: string): number {
    let index = 0;
    while (
      index < string1.length &&
      index < string2.length &&
      string1.charAt(index) === string2.charAt(index)
    ) {
      index++;
    }

    return index;
  }

  /**
   * Returns the index of the last character that is not an identifier
   * character in the given string, at or before the given index.
   */
  private lastNonIdentifierIndex(line: string, index: number): number {
    while (index >= 0 && this.isJavaIdentifierPart(line.charAt(index))) {
      index--;
    }

    return index;
  }

  /**
   * Check if a character is a valid Java identifier part.
   */
  private isJavaIdentifierPart(char: string): boolean {
    return /\p{ID_Continue}/u.test(char) || char === '$';
  }

  private sourceFileName(className: string): string {
    const index1 = className.lastIndexOf('.') + 1;
    const index2 = className.indexOf('$', index1);
    return (
      (index2 > 0 ? className.substring(index1, index2) : className.substring(index1)) + '.java'
    );
  }
}
