/**
 * Utility class for class name conversions.
 */
export class ClassUtil {
  /**
   * Converts an internal class name into an external class name.
   * Internal class names use '/' as package separator (e.g., "com/example/Foo").
   * External class names use '.' as package separator (e.g., "com.example.Foo").
   */
  static externalClassName(internalClassName: string): string {
    return internalClassName.replace(/\//g, '.');
  }

  /**
   * Converts an external class name into an internal class name.
   * External class names use '.' as package separator (e.g., "com.example.Foo").
   * Internal class names use '/' as package separator (e.g., "com/example/Foo").
   */
  static internalClassName(externalClassName: string): string {
    return externalClassName.replace(/\./g, '/');
  }
}
