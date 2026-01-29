/*
 * ProGuard -- shrinking, optimization, obfuscation, and preverification
 *             of Java bytecode.
 *
 * Copyright (c) 2002-2020 Guardsquare NV
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
 */
package proguard.classfile.util;

/**
 * Minimal ClassUtil containing only the methods needed by ReTrace.
 * The full version is in proguard-core.
 *
 * @author Eric Lafortune
 */
public class ClassUtil
{
    /**
     * Converts an internal class name into an external class name.
     * Internal class names use '/' as package separator (e.g., "com/example/Foo").
     * External class names use '.' as package separator (e.g., "com.example.Foo").
     */
    public static String externalClassName(String internalClassName)
    {
        return internalClassName.replace('/', '.');
    }

    /**
     * Converts an external class name into an internal class name.
     * External class names use '.' as package separator (e.g., "com.example.Foo").
     * Internal class names use '/' as package separator (e.g., "com/example/Foo").
     */
    public static String internalClassName(String externalClassName)
    {
        return externalClassName.replace('.', '/');
    }
}
