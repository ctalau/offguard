/**
 * This interface specifies methods to process name mappings between original
 * classes and their obfuscated versions. The mappings are typically read
 * from a mapping file.
 */
export interface MappingProcessor {
  /**
   * Processes the given class name mapping.
   *
   * @param className the original class name.
   * @param newClassName the new class name.
   * @return whether the processor is interested in receiving mappings of the
   *         class members of this class.
   */
  processClassMapping(className: string, newClassName: string): boolean;

  /**
   * Processes the given field name mapping.
   * @param className    the original class name.
   * @param fieldType    the original external field type.
   * @param fieldName    the original field name.
   * @param newClassName the new class name.
   * @param newFieldName the new field name.
   */
  processFieldMapping(
    className: string,
    fieldType: string,
    fieldName: string,
    newClassName: string,
    newFieldName: string
  ): void;

  /**
   * Processes the given method name mapping.
   * @param className          the original class name.
   * @param firstLineNumber    the first line number of the method, or 0 if
   *                           it is not known.
   * @param lastLineNumber     the last line number of the method, or 0 if
   *                           it is not known.
   * @param methodReturnType   the original external method return type.
   * @param methodName         the original external method name.
   * @param methodArguments    the original external method arguments.
   * @param newClassName       the new class name.
   * @param newFirstLineNumber the new first line number of the method, or 0
   *                           if it is not known.
   * @param newLastLineNumber  the new last line number of the method, or 0
   *                           if it is not known.
   * @param newMethodName      the new method name.
   */
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
    newMethodName: string
  ): void;
}
