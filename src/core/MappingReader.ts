import { MappingProcessor } from './MappingProcessor';

/**
 * This class can parse mapping files and invoke a processor for each of the
 * mapping entries.
 */
export class MappingReader {
  constructor(private readonly mappingContent: string) {}

  /**
   * Reads the mapping file, presenting all of the encountered mapping entries
   * to the given processor.
   */
  pump(mappingProcessor: MappingProcessor): void {
    const lines = this.mappingContent.split('\n');
    let className: string | null = null;

    // Read the subsequent class mappings and class member mappings.
    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Is it a non-comment line?
      if (!line.startsWith('#')) {
        // Is it a class mapping or a class member mapping?
        if (line.endsWith(':')) {
          // Process the class mapping and remember the class's old name.
          className = this.processClassMapping(line, mappingProcessor);
        } else if (className !== null && line.length > 0) {
          // Process the class member mapping, in the context of
          // the current old class name.
          this.processClassMemberMapping(className, line, mappingProcessor);
        }
      }
    }
  }

  /**
   * Parses the given line with a class mapping and processes the
   * results with the given mapping processor. Returns the old class name,
   * or null if any subsequent class member lines can be ignored.
   */
  private processClassMapping(
    line: string,
    mappingProcessor: MappingProcessor
  ): string | null {
    // See if we can parse "___ -> ___:", containing the original
    // class name and the new class name.

    const arrowIndex = line.indexOf('->');
    if (arrowIndex < 0) {
      return null;
    }

    const colonIndex = line.indexOf(':', arrowIndex + 2);
    if (colonIndex < 0) {
      return null;
    }

    // Extract the elements.
    const className = line.substring(0, arrowIndex).trim();
    const newClassName = line.substring(arrowIndex + 2, colonIndex).trim();

    // Process this class name mapping.
    const interested = mappingProcessor.processClassMapping(
      className,
      newClassName
    );

    return interested ? className : null;
  }

  /**
   * Parses the given line with a class member mapping and processes the
   * results with the given mapping processor.
   */
  private processClassMemberMapping(
    className: string,
    line: string,
    mappingProcessor: MappingProcessor
  ): void {
    // See if we can parse one of
    //     ___ ___ -> ___
    //     ___:___:___ ___(___) -> ___
    //     ___:___:___ ___(___):___ -> ___
    //     ___:___:___ ___(___):___:___ -> ___
    // containing the optional line numbers, the return type, the original
    // field/method name, optional arguments, the optional original line
    // numbers, and the new field/method name. The original field/method
    // name may contain an original class name "___.___".

    const colonIndex1 = line.indexOf(':');
    const colonIndex2 =
      colonIndex1 < 0 ? -1 : line.indexOf(':', colonIndex1 + 1);
    const spaceIndex = line.indexOf(' ', colonIndex2 + 2);
    const argumentIndex1 = line.indexOf('(', spaceIndex + 1);
    const argumentIndex2 =
      argumentIndex1 < 0 ? -1 : line.indexOf(')', argumentIndex1 + 1);
    const colonIndex3 =
      argumentIndex2 < 0 ? -1 : line.indexOf(':', argumentIndex2 + 1);
    const colonIndex4 =
      colonIndex3 < 0 ? -1 : line.indexOf(':', colonIndex3 + 1);
    const arrowIndex = line.indexOf(
      '->',
      (colonIndex4 >= 0
        ? colonIndex4
        : colonIndex3 >= 0
        ? colonIndex3
        : argumentIndex2 >= 0
        ? argumentIndex2
        : spaceIndex) + 1
    );

    if (spaceIndex < 0 || arrowIndex < 0) {
      return;
    }

    // Extract the elements.
    const type = line.substring(colonIndex2 + 1, spaceIndex).trim();
    const name = line
      .substring(spaceIndex + 1, argumentIndex1 >= 0 ? argumentIndex1 : arrowIndex)
      .trim();
    const newName = line.substring(arrowIndex + 2).trim();

    // Does the method name contain an explicit original class name?
    let newClassName = className;
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex >= 0) {
      className = name.substring(0, dotIndex);
      const nameWithoutClass = name.substring(dotIndex + 1);

      // Process this class member mapping.
      if (type.length > 0 && nameWithoutClass.length > 0 && newName.length > 0) {
        this.processMemberMapping(
          className,
          type,
          nameWithoutClass,
          newClassName,
          newName,
          line,
          colonIndex1,
          colonIndex2,
          colonIndex3,
          colonIndex4,
          argumentIndex1,
          argumentIndex2,
          arrowIndex,
          mappingProcessor
        );
      }
    } else {
      // Process this class member mapping.
      if (type.length > 0 && name.length > 0 && newName.length > 0) {
        this.processMemberMapping(
          className,
          type,
          name,
          newClassName,
          newName,
          line,
          colonIndex1,
          colonIndex2,
          colonIndex3,
          colonIndex4,
          argumentIndex1,
          argumentIndex2,
          arrowIndex,
          mappingProcessor
        );
      }
    }
  }

  private processMemberMapping(
    className: string,
    type: string,
    name: string,
    newClassName: string,
    newName: string,
    line: string,
    colonIndex1: number,
    colonIndex2: number,
    colonIndex3: number,
    colonIndex4: number,
    argumentIndex1: number,
    argumentIndex2: number,
    arrowIndex: number,
    mappingProcessor: MappingProcessor
  ): void {
    // Is it a field or a method?
    if (argumentIndex2 < 0) {
      mappingProcessor.processFieldMapping(
        className,
        type,
        name,
        newClassName,
        newName
      );
    } else {
      let firstLineNumber = 0;
      let lastLineNumber = 0;
      let newFirstLineNumber = 0;
      let newLastLineNumber = 0;

      if (colonIndex2 >= 0) {
        firstLineNumber = newFirstLineNumber = parseInt(
          line.substring(0, colonIndex1).trim(),
          10
        );
        lastLineNumber = newLastLineNumber = parseInt(
          line.substring(colonIndex1 + 1, colonIndex2).trim(),
          10
        );
      }

      if (colonIndex3 >= 0) {
        firstLineNumber = parseInt(
          line
            .substring(colonIndex3 + 1, colonIndex4 > 0 ? colonIndex4 : arrowIndex)
            .trim(),
          10
        );
        lastLineNumber =
          colonIndex4 < 0
            ? firstLineNumber
            : parseInt(line.substring(colonIndex4 + 1, arrowIndex).trim(), 10);
      }

      const methodArguments = line.substring(argumentIndex1 + 1, argumentIndex2).trim();

      mappingProcessor.processMethodMapping(
        className,
        firstLineNumber,
        lastLineNumber,
        type,
        name,
        methodArguments,
        newClassName,
        newFirstLineNumber,
        newLastLineNumber,
        newName
      );
    }
  }
}
