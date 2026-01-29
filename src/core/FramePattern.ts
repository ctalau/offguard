import { FrameInfo } from './FrameInfo';
import { ClassUtil } from './ClassUtil';

/**
 * This class can parse and format lines that represent stack frames
 * matching a given regular expression.
 */
export class FramePattern {
  // The pattern matcher has problems with \b against some unicode
  // characters, so we're no longer using \b for classes and class members.
  private static readonly REGEX_CLASS = '(?:[^\\s":./()]+\\.)*[^\\s":./()]+';
  private static readonly REGEX_CLASS_SLASH = '(?:[^\\s":./()]+/)*[^\\s":./()]+';
  // Source file strings can not start with a digit, otherwise we can not
  // distinguish them from line numbers.
  private static readonly REGEX_SOURCE_FILE = '(?:[^:()\\d][^:()]*)?';
  private static readonly REGEX_LINE_NUMBER = '-?\\b\\d+\\b';
  private static readonly REGEX_TYPE = FramePattern.REGEX_CLASS + '(?:\\[\\])*';
  private static readonly REGEX_MEMBER = '<?[^\\s":./()]+>?';
  private static readonly REGEX_ARGUMENTS =
    '(?:' + FramePattern.REGEX_TYPE + '(?:\\s*,\\s*' + FramePattern.REGEX_TYPE + ')*)?';

  private readonly expressionTypes: string[] = [];
  private readonly pattern: RegExp;
  private readonly verbose: boolean;

  /**
   * Creates a new FramePattern.
   */
  constructor(regularExpression: string, verbose: boolean) {
    // Construct the regular expression.
    let expressionBuffer = '';
    const expressionTypes: string[] = [];

    let index = 0;
    while (true) {
      const nextIndex = regularExpression.indexOf('%', index);
      if (
        nextIndex < 0 ||
        nextIndex === regularExpression.length - 1 ||
        expressionTypes.length === 32
      ) {
        break;
      }

      // Copy a literal piece of the input line.
      // Note: The regularExpression is already a regex pattern, so we don't escape it
      expressionBuffer += regularExpression.substring(index, nextIndex);
      expressionBuffer += '(';

      const expressionType = regularExpression.charAt(nextIndex + 1);
      switch (expressionType) {
        case 'c':
          expressionBuffer += FramePattern.REGEX_CLASS;
          break;

        case 'C':
          expressionBuffer += FramePattern.REGEX_CLASS_SLASH;
          break;

        case 's':
          expressionBuffer += FramePattern.REGEX_SOURCE_FILE;
          break;

        case 'l':
          expressionBuffer += FramePattern.REGEX_LINE_NUMBER;
          break;

        case 't':
          expressionBuffer += FramePattern.REGEX_TYPE;
          break;

        case 'f':
          expressionBuffer += FramePattern.REGEX_MEMBER;
          break;

        case 'm':
          expressionBuffer += FramePattern.REGEX_MEMBER;
          break;

        case 'a':
          expressionBuffer += FramePattern.REGEX_ARGUMENTS;
          break;
      }

      expressionBuffer += ')';

      expressionTypes.push(expressionType);

      index = nextIndex + 2;
    }

    // Copy the last literal piece of the input line.
    // Note: The regularExpression is already a regex pattern, so we don't escape it
    expressionBuffer += regularExpression.substring(index);

    this.expressionTypes = expressionTypes;
    // Use 'd' flag to get capture group indices
    // Anchor the expression to match the entire line, like Java's matches()
    this.pattern = new RegExp(`^(?:${expressionBuffer})$`, 'd');
    this.verbose = verbose;
  }

  /**
   * Parses all frame information from a given line.
   * @param  line a line that represents a stack frame.
   * @return the parsed information, or null if the line doesn't match a
   *         stack frame.
   */
  parse(line: string): FrameInfo | null {
    // Try to match it against the regular expression.
    const matcher = this.pattern.exec(line);

    if (!matcher) {
      return null;
    }

    // The line matched the regular expression.
    let className: string | null = null;
    let sourceFile: string | null = null;
    let lineNumber = 0;
    let type: string | null = null;
    let fieldName: string | null = null;
    let methodName: string | null = null;
    let args: string | null = null;

    // Extract a class name, a line number, a type, and arguments.
    for (
      let expressionTypeIndex = 0;
      expressionTypeIndex < this.expressionTypes.length;
      expressionTypeIndex++
    ) {
      const match = matcher[expressionTypeIndex + 1];

      if (match !== undefined) {
        const expressionType = this.expressionTypes[expressionTypeIndex];
        switch (expressionType) {
          case 'c':
            className = match;
            break;

          case 'C':
            className = ClassUtil.externalClassName(match);
            break;

          case 's':
            sourceFile = match.length > 0 ? match : null;
            break;

          case 'l':
            lineNumber = parseInt(match, 10);
            break;

          case 't':
            type = match;
            break;

          case 'f':
            fieldName = match;
            break;

          case 'm':
            methodName = match;
            break;

          case 'a':
            args = match;
            break;
        }
      }
    }

    return new FrameInfo(className, sourceFile, lineNumber, type, fieldName, methodName, args);
  }

  /**
   * Formats the given frame information based on the given template line.
   * It is the reverse of {@link #parse(String)}, but optionally with
   * different frame information.
   * @param  line      a template line that represents a stack frame.
   * @param  frameInfo information about a stack frame.
   * @return the formatted line, or null if the line doesn't match a
   *         stack frame.
   */
  format(line: string, frameInfo: FrameInfo): string | null {
    // Try to match it against the regular expression.
    const matcher = this.pattern.exec(line);

    if (!matcher) {
      return null;
    }

    let formattedBuffer = '';
    let lineIndex = 0;

    // Get the indices of capture groups (available due to 'd' flag)
    const indices = (matcher as any).indices;

    for (
      let expressionTypeIndex = 0;
      expressionTypeIndex < this.expressionTypes.length;
      expressionTypeIndex++
    ) {
      const match = matcher[expressionTypeIndex + 1];

      if (match !== undefined && indices && indices[expressionTypeIndex + 1]) {
        const [startIndex, endIndex] = indices[expressionTypeIndex + 1];

        // Copy a literal piece of the input line.
        formattedBuffer += line.substring(lineIndex, startIndex);

        // Copy a matched and translated piece of the input line.
        const expressionType = this.expressionTypes[expressionTypeIndex];
        switch (expressionType) {
          case 'c':
            formattedBuffer += frameInfo.className || '';
            break;

          case 'C':
            formattedBuffer += ClassUtil.internalClassName(frameInfo.className || '');
            break;

          case 's':
            formattedBuffer += frameInfo.sourceFile || '';
            break;

          case 'l':
            // Add a colon if needed.
            if (
              formattedBuffer.length > 0 &&
              formattedBuffer.charAt(formattedBuffer.length - 1) !== ':'
            ) {
              formattedBuffer += ':';
            }
            formattedBuffer += frameInfo.lineNumber;
            break;

          case 't':
            formattedBuffer += frameInfo.type || '';
            break;

          case 'f':
            if (this.verbose) {
              formattedBuffer += (frameInfo.type || '') + ' ';
            }
            formattedBuffer += frameInfo.fieldName || '';
            break;

          case 'm':
            if (this.verbose) {
              formattedBuffer += (frameInfo.type || '') + ' ';
            }
            formattedBuffer += frameInfo.methodName || '';
            if (this.verbose) {
              formattedBuffer += '(' + (frameInfo.methodArguments || '') + ')';
            }
            break;

          case 'a':
            formattedBuffer += frameInfo.methodArguments || '';
            break;
        }

        // Skip the original element whose replacement value
        // has just been appended.
        lineIndex = endIndex;
      }
    }

    // Copy the last literal piece of the input line.
    formattedBuffer += line.substring(lineIndex);

    // Return the formatted line.
    return formattedBuffer;
  }
}
