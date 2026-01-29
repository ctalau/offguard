#!/bin/bash
# Script to download ProGuard retrace sources from GitHub
# This downloads only the minimal files needed for retrace functionality:
# - retrace module (FrameInfo, FramePattern, FrameRemapper, ReTrace)
# - MappingReader and MappingProcessor from obfuscate module
# - Minimal ClassUtil stub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PROGUARD_SOURCES_DIR="$ROOT_DIR/proguard-sources"

echo "=== Downloading ProGuard retrace sources ==="
echo "Target directory: $PROGUARD_SOURCES_DIR"

# Clean up existing directory
if [ -d "$PROGUARD_SOURCES_DIR" ]; then
    echo "Removing existing proguard-sources directory..."
    rm -rf "$PROGUARD_SOURCES_DIR"
fi

# Create a temporary directory for cloning
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Clone with sparse checkout
cd "$TEMP_DIR"
git clone --depth 1 --filter=blob:none --sparse https://github.com/Guardsquare/proguard.git proguard
cd proguard

# Enable sparse checkout and add the directories we need
git sparse-checkout set retrace/src base/src

echo "Sparse checkout configured for retrace and base modules"

# Create the target directory structure
mkdir -p "$PROGUARD_SOURCES_DIR/retrace"
mkdir -p "$PROGUARD_SOURCES_DIR/obfuscate"
mkdir -p "$PROGUARD_SOURCES_DIR/classfile/util"

# Copy the retrace sources (only the 4 core files)
echo "Copying retrace sources..."
for file in FrameInfo.java FramePattern.java FrameRemapper.java ReTrace.java; do
    if [ -f "retrace/src/main/java/proguard/retrace/$file" ]; then
        cp "retrace/src/main/java/proguard/retrace/$file" "$PROGUARD_SOURCES_DIR/retrace/"
        echo "  Copied: retrace/$file"
    fi
done

# Copy only the required obfuscate files (MappingReader and MappingProcessor)
echo "Copying required obfuscate sources..."
for file in MappingReader.java MappingProcessor.java; do
    if [ -f "base/src/main/java/proguard/obfuscate/$file" ]; then
        cp "base/src/main/java/proguard/obfuscate/$file" "$PROGUARD_SOURCES_DIR/obfuscate/"
        echo "  Copied: obfuscate/$file"
    fi
done

# Create minimal ClassUtil stub (only the methods needed by retrace)
echo "Creating minimal ClassUtil..."
cat > "$PROGUARD_SOURCES_DIR/classfile/util/ClassUtil.java" << 'EOF'
/*
 * ProGuard -- shrinking, optimization, obfuscation, and preverification
 *             of Java bytecode.
 *
 * Copyright (c) 2002-2020 Guardsquare NV
 *
 * Minimal ClassUtil stub containing only methods needed by ReTrace.
 * The full version is in proguard-core.
 */
package proguard.classfile.util;

public class ClassUtil
{
    /**
     * Converts an internal class name into an external class name.
     * Internal: "com/example/Foo" -> External: "com.example.Foo"
     */
    public static String externalClassName(String internalClassName)
    {
        return internalClassName.replace('/', '.');
    }

    /**
     * Converts an external class name into an internal class name.
     * External: "com.example.Foo" -> Internal: "com/example/Foo"
     */
    public static String internalClassName(String externalClassName)
    {
        return externalClassName.replace('.', '/');
    }
}
EOF
echo "  Created: classfile/util/ClassUtil.java"

# Clean up temp directory
echo "Cleaning up temp directory..."
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "=== Download complete ==="
echo "ProGuard sources downloaded to: $PROGUARD_SOURCES_DIR"
echo ""
echo "Files downloaded:"
find "$PROGUARD_SOURCES_DIR" -type f -name "*.java" | sort
echo ""
echo "Total Java files: $(find "$PROGUARD_SOURCES_DIR" -type f -name "*.java" | wc -l)"
