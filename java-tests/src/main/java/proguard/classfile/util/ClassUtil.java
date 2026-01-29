package proguard.classfile.util;

/**
 * Minimal ClassUtil for converting between internal and external class names.
 */
public class ClassUtil {

    /**
     * Converts an internal class name to an external class name.
     * Internal: com/example/Foo
     * External: com.example.Foo
     */
    public static String externalClassName(String internalClassName) {
        return internalClassName == null ? null : internalClassName.replace('/', '.');
    }

    /**
     * Converts an external class name to an internal class name.
     * External: com.example.Foo
     * Internal: com/example/Foo
     */
    public static String internalClassName(String externalClassName) {
        return externalClassName == null ? null : externalClassName.replace('.', '/');
    }
}
