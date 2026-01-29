/**
 * This class represents the class name, field name, method name, etc.
 * possibly found in a stack frame. Values that are not defined are null.
 */
export class FrameInfo {
  constructor(
    public readonly className: string | null,
    public readonly sourceFile: string | null,
    public readonly lineNumber: number,
    public readonly type: string | null,
    public readonly fieldName: string | null,
    public readonly methodName: string | null,
    public readonly methodArguments: string | null
  ) {}

  toString(): string {
    return `FrameInfo(class=[${this.className}], line=[${this.lineNumber}], type=[${this.type}], field=[${this.fieldName}], method=[${this.methodName}], arguments=[${this.methodArguments}])`;
  }
}
