import { FrameInfo } from './FrameInfo';
import { MappingProcessor } from './MappingProcessor';

/**
 * Information about the original version and the obfuscated version of
 * a field (without the obfuscated class name or field name).
 */
class FieldInfo {
  constructor(
    public readonly originalClassName: string,
    public readonly originalType: string,
    public readonly originalName: string
  ) {}

  /**
   * Returns whether the given type matches the original type of this field.
   * The given type may be a null wildcard.
   */
  matches(originalType: string | null): boolean {
    return originalType === null || originalType === this.originalType;
  }
}

/**
 * Information about the original version and the obfuscated version of
 * a method (without the obfuscated class name or method name).
 */
class MethodInfo {
  constructor(
    public readonly obfuscatedFirstLineNumber: number,
    public readonly obfuscatedLastLineNumber: number,
    public readonly originalClassName: string,
    public readonly originalFirstLineNumber: number,
    public readonly originalLastLineNumber: number,
    public readonly originalType: string,
    public readonly originalName: string,
    public readonly originalArguments: string,
    public readonly hasObfuscatedLineInfo: boolean,
    public readonly hasOriginalLineInfo: boolean
  ) {}

  /**
   * Returns whether the given properties match the properties of this
   * method. The given properties may be null wildcards.
   */
  matches(
    obfuscatedLineNumber: number,
    originalType: string | null,
    originalArguments: string | null
  ): boolean {
    if (obfuscatedLineNumber === 0) {
      if (this.hasObfuscatedLineInfo || this.hasOriginalLineInfo) {
        return false;
      }
    } else if (this.hasObfuscatedLineInfo || this.hasOriginalLineInfo) {
      if (!this.hasObfuscatedLineInfo) {
        return false;
      }
      if (!this.hasOriginalLineInfo) {
        return false;
      }
      if (this.obfuscatedFirstLineNumber === 0 && this.obfuscatedLastLineNumber === 0) {
        return false;
      }
      if (this.originalFirstLineNumber === 0 && this.originalLastLineNumber === 0) {
        return false;
      }
      if (
        obfuscatedLineNumber < this.obfuscatedFirstLineNumber ||
        obfuscatedLineNumber > this.obfuscatedLastLineNumber
      ) {
        return false;
      }
    }
    return (
      (originalType === null || originalType === this.originalType) &&
      (originalArguments === null || originalArguments === this.originalArguments)
    );
  }
}

/**
 * This class accumulates mapping information and then transforms stack frames
 * accordingly.
 */
export class FrameRemapper implements MappingProcessor {
  // Obfuscated class name -> original class name.
  private readonly classMap = new Map<string, string>();

  // Original class name -> obfuscated member name -> member info set.
  private readonly classFieldMap = new Map<string, Map<string, Set<FieldInfo>>>();
  private readonly classMethodMap = new Map<string, Map<string, Set<MethodInfo>>>();

  /**
   * Transforms the given obfuscated frame back to one or more original frames.
   */
  transform(obfuscatedFrame: FrameInfo): FrameInfo[] | null {
    // First remap the class name.
    const originalClassName = this.originalClassName(obfuscatedFrame.className || '');
    if (originalClassName === null) {
      return null;
    }

    const originalFrames: FrameInfo[] = [];

    // Create any transformed frames with remapped field names.
    this.transformFieldInfo(obfuscatedFrame, originalClassName, originalFrames);

    // Create any transformed frames with remapped method names.
    this.transformMethodInfo(obfuscatedFrame, originalClassName, originalFrames);

    if (originalFrames.length === 0) {
      if (
        obfuscatedFrame.sourceFile === 'Unknown Source' &&
        obfuscatedFrame.lineNumber > 0
      ) {
        originalFrames.push(
          new FrameInfo(
            originalClassName,
            'Unknown Source',
            obfuscatedFrame.lineNumber,
            obfuscatedFrame.type,
            obfuscatedFrame.fieldName,
            obfuscatedFrame.methodName,
            obfuscatedFrame.methodArguments
          )
        );
      } else if (obfuscatedFrame.methodName === null && obfuscatedFrame.fieldName === null) {
        originalFrames.push(
          new FrameInfo(
            originalClassName,
            obfuscatedFrame.sourceFile,
            obfuscatedFrame.lineNumber,
            obfuscatedFrame.type,
            obfuscatedFrame.fieldName,
            obfuscatedFrame.methodName,
            obfuscatedFrame.methodArguments
          )
        );
      } else {
        return null;
      }
    }

    return originalFrames;
  }

  /**
   * Transforms the obfuscated frame into one or more original frames,
   * if the frame contains information about a field that can be remapped.
   * @param obfuscatedFrame     the obfuscated frame.
   * @param originalFieldFrames the list in which remapped frames can be
   *                            collected.
   */
  private transformFieldInfo(
    obfuscatedFrame: FrameInfo,
    originalClassName: string,
    originalFieldFrames: FrameInfo[]
  ): void {
    // Class name -> obfuscated field names.
    const fieldMap = this.classFieldMap.get(originalClassName);
    if (fieldMap !== undefined) {
      // Obfuscated field names -> fields.
      const obfuscatedFieldName = obfuscatedFrame.fieldName;
      if (obfuscatedFieldName !== null) {
        const fieldSet = fieldMap.get(obfuscatedFieldName);
        if (fieldSet !== undefined) {
          const obfuscatedType = obfuscatedFrame.type;
          const originalType = obfuscatedType === null ? null : this.originalType(obfuscatedType);

          // Find all matching fields.
          for (const fieldInfo of fieldSet) {
            if (fieldInfo.matches(originalType)) {
              originalFieldFrames.push(
                new FrameInfo(
                  fieldInfo.originalClassName,
                  this.resolveSourceFile(obfuscatedFrame, fieldInfo.originalClassName),
                  obfuscatedFrame.lineNumber,
                  fieldInfo.originalType,
                  fieldInfo.originalName,
                  obfuscatedFrame.methodName,
                  obfuscatedFrame.methodArguments
                )
              );
            }
          }
        }
      }
    }
  }

  /**
   * Transforms the obfuscated frame into one or more original frames,
   * if the frame contains information about a method that can be remapped.
   * @param obfuscatedFrame      the obfuscated frame.
   * @param originalMethodFrames the list in which remapped frames can be
   *                             collected.
   */
  private transformMethodInfo(
    obfuscatedFrame: FrameInfo,
    originalClassName: string,
    originalMethodFrames: FrameInfo[]
  ): void {
    const allowPreambleMatch =
      obfuscatedFrame.lineNumber === 0 && obfuscatedFrame.sourceFile === 'SourceFile';
    // Class name -> obfuscated method names.
    const methodMap = this.classMethodMap.get(originalClassName);
    if (methodMap !== undefined) {
      // Obfuscated method names -> methods.
      const obfuscatedMethodName = obfuscatedFrame.methodName;
      if (obfuscatedMethodName !== null) {
        const methodSet = methodMap.get(obfuscatedMethodName);
        if (methodSet !== undefined) {
          const obfuscatedLineNumber = obfuscatedFrame.lineNumber;

          const obfuscatedType = obfuscatedFrame.type;
          const originalType = obfuscatedType === null ? null : this.originalType(obfuscatedType);

          const obfuscatedArguments = obfuscatedFrame.methodArguments;
          const originalArguments =
            obfuscatedArguments === null ? null : this.originalArguments(obfuscatedArguments);

          // Find all matching methods.
          for (const methodInfo of methodSet) {
            if (
              methodInfo.matches(obfuscatedLineNumber, originalType, originalArguments) ||
              (allowPreambleMatch &&
                methodInfo.hasObfuscatedLineInfo &&
                methodInfo.hasOriginalLineInfo &&
                methodInfo.obfuscatedFirstLineNumber > 0)
            ) {
              // Do we have a different original first line number?
              // We're allowing unknown values, represented as 0.
              let lineNumber = obfuscatedFrame.lineNumber;
              if (methodInfo.originalFirstLineNumber !== methodInfo.obfuscatedFirstLineNumber) {
                // Do we have an original line number range and
                // sufficient information to shift the line number?
                lineNumber =
                  methodInfo.originalLastLineNumber !== 0 &&
                  methodInfo.originalLastLineNumber !== methodInfo.originalFirstLineNumber &&
                  methodInfo.obfuscatedFirstLineNumber !== 0 &&
                  lineNumber !== 0
                    ? methodInfo.originalFirstLineNumber -
                      methodInfo.obfuscatedFirstLineNumber +
                      lineNumber
                    : methodInfo.originalFirstLineNumber;
              }

              originalMethodFrames.push(
                new FrameInfo(
                  methodInfo.originalClassName,
                  this.resolveSourceFile(obfuscatedFrame, methodInfo.originalClassName),
                  lineNumber,
                  methodInfo.originalType,
                  obfuscatedFrame.fieldName,
                  methodInfo.originalName,
                  methodInfo.originalArguments
                )
              );
            }
          }
        }
      }
    }
  }

  /**
   * Returns the original argument types.
   */
  private originalArguments(obfuscatedArguments: string): string {
    const originalArguments: string[] = [];

    let startIndex = 0;
    while (true) {
      const endIndex = obfuscatedArguments.indexOf(',', startIndex);
      if (endIndex < 0) {
        break;
      }

      originalArguments.push(
        this.originalType(obfuscatedArguments.substring(startIndex, endIndex).trim())
      );

      startIndex = endIndex + 1;
    }

    originalArguments.push(this.originalType(obfuscatedArguments.substring(startIndex).trim()));

    return originalArguments.join(',');
  }

  /**
   * Returns the original type.
   */
  private originalType(obfuscatedType: string): string {
    const index = obfuscatedType.indexOf('[');

    return index >= 0
      ? this.originalClassName(obfuscatedType.substring(0, index)) + obfuscatedType.substring(index)
      : this.originalClassName(obfuscatedType);
  }

  /**
   * Returns the original class name.
   */
  originalClassName(obfuscatedClassName: string): string {
    const originalClassName = this.classMap.get(obfuscatedClassName);

    return originalClassName !== undefined ? originalClassName : obfuscatedClassName;
  }

  hasMethodMapping(obfuscatedClassName: string, obfuscatedMethodName: string): boolean {
    const originalClassName = this.originalClassName(obfuscatedClassName);
    const methodMap = this.classMethodMap.get(originalClassName);
    return methodMap !== undefined && methodMap.has(obfuscatedMethodName);
  }

  hasMethodMappingWithObfuscatedLineInfo(
    obfuscatedClassName: string,
    obfuscatedMethodName: string
  ): boolean {
    const originalClassName = this.originalClassName(obfuscatedClassName);
    const methodMap = this.classMethodMap.get(originalClassName);
    const methodSet = methodMap?.get(obfuscatedMethodName);
    if (!methodSet) {
      return false;
    }
    for (const methodInfo of methodSet) {
      if (
        methodInfo.hasObfuscatedLineInfo &&
        (methodInfo.obfuscatedFirstLineNumber !== 0 || methodInfo.obfuscatedLastLineNumber !== 0)
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns the Java source file name that typically corresponds to the
   * given class name.
   */
  private sourceFileName(className: string): string {
    const index1 = className.lastIndexOf('.') + 1;
    const index2 = className.indexOf('$', index1);

    return (
      (index2 > 0 ? className.substring(index1, index2) : className.substring(index1)) + '.java'
    );
  }

  private resolveSourceFile(obfuscatedFrame: FrameInfo, className: string): string | null {
    if (obfuscatedFrame.sourceFile === 'Unknown Source') {
      return 'Unknown Source';
    }
    return this.sourceFileName(className);
  }

  // Implementations for MappingProcessor.

  processClassMapping(className: string, newClassName: string): boolean {
    // Obfuscated class name -> original class name.
    this.classMap.set(newClassName, className);

    return true;
  }

  processFieldMapping(
    className: string,
    fieldType: string,
    fieldName: string,
    newClassName: string,
    newFieldName: string
  ): void {
    // Obfuscated class name -> obfuscated field names.
    let fieldMap = this.classFieldMap.get(newClassName);
    if (fieldMap === undefined) {
      fieldMap = new Map<string, Set<FieldInfo>>();
      this.classFieldMap.set(newClassName, fieldMap);
    }

    // Obfuscated field name -> fields.
    let fieldSet = fieldMap.get(newFieldName);
    if (fieldSet === undefined) {
      fieldSet = new Set<FieldInfo>();
      fieldMap.set(newFieldName, fieldSet);
    }

    // Add the field information.
    fieldSet.add(new FieldInfo(className, fieldType, fieldName));
  }

  processMethodMapping(
    className: string,
    firstLineNumber: number,
    lastLineNumber: number,
    methodReturnType: string,
    methodName: string,
    methodArguments: string,
    newClassName: string,
    newFirstLineNumber: number,
    newLastLineNumber: number,
    newMethodName: string,
    hasObfuscatedLineInfo: boolean,
    hasOriginalLineInfo: boolean
  ): void {
    // Original class name -> obfuscated method names.
    let methodMap = this.classMethodMap.get(newClassName);
    if (methodMap === undefined) {
      methodMap = new Map<string, Set<MethodInfo>>();
      this.classMethodMap.set(newClassName, methodMap);
    }

    // Obfuscated method name -> methods.
    let methodSet = methodMap.get(newMethodName);
    if (methodSet === undefined) {
      methodSet = new Set<MethodInfo>();
      methodMap.set(newMethodName, methodSet);
    }

    // Add the method information.
    methodSet.add(
      new MethodInfo(
        newFirstLineNumber,
        newLastLineNumber,
        className,
        firstLineNumber,
        lastLineNumber,
        methodReturnType,
        methodName,
        methodArguments,
        hasObfuscatedLineInfo,
        hasOriginalLineInfo
      )
    );
  }
}
