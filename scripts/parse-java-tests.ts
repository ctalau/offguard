#!/usr/bin/env tsx

/**
 * Parse Java test files from R8 and generate XML test fixtures
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestData {
  name: string;
  obfuscatedStackTrace: string[];
  retracedStackTrace: string[];
  retraceVerboseStackTrace?: string[];
  mapping: string;
  expectedWarnings: number;
}

/**
 * Extract string array from Java Arrays.asList(...) or ImmutableList.of(...) call
 */
function extractStringArray(content: string, methodName: string): string[] | null {
  // Match the method and its return statement - try both Arrays.asList and ImmutableList.of
  const patterns = [
    new RegExp(
      `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*return\\s+Arrays\\.asList\\s*\\(([^;]+)\\);`,
      's'
    ),
    new RegExp(
      `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*return\\s+ImmutableList\\.of\\s*\\(([^;]+)\\);`,
      's'
    ),
  ];

  let argsContent: string | null = null;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      argsContent = match[1];
      break;
    }
  }

  if (!argsContent) return null;

  // Extract all string literals, handling multi-line strings
  const strings: string[] = [];
  let inString = false;
  let currentString = '';
  let escapeNext = false;

  for (let i = 0; i < argsContent.length; i++) {
    const char = argsContent[i];

    if (escapeNext) {
      currentString += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      currentString += char;
      continue;
    }

    if (char === '"') {
      if (inString) {
        // End of string
        strings.push(currentString);
        currentString = '';
        inString = false;
      } else {
        // Start of string
        inString = true;
      }
    } else if (inString) {
      currentString += char;
    }
  }

  return strings;
}

/**
 * Extract mapping string from StringUtils.lines(...), StringUtils.joinLines(...), or string concatenation
 */
function extractMapping(content: string): string | null {
  // Match the mapping() method
  const pattern = /public\s+String\s+mapping\s*\(\s*\)\s*\{[^}]*return\s+([^;]+);/s;
  const match = content.match(pattern);

  if (!match) return null;

  const returnValue = match[1].trim();

  // Handle StringUtils.lines(...) or StringUtils.joinLines(...)
  if (returnValue.includes('StringUtils.lines') || returnValue.includes('StringUtils.joinLines')) {
    const argsMatch = returnValue.match(/StringUtils\.(lines|joinLines)\s*\((.+)\)/s);
    if (argsMatch) {
      const argsContent = argsMatch[2];
      const strings = extractStringsFromArgs(argsContent);
      return strings.join('\n');
    }
  }

  // Handle direct string literal (including empty string)
  if (returnValue.startsWith('"')) {
    const stringMatch = returnValue.match(/"([^"]*)"/);
    if (stringMatch) {
      return stringMatch[1]; // Can be empty string
    }
  }

  // Handle empty string explicitly
  if (returnValue === '""') {
    return '';
  }

  return null;
}

/**
 * Extract strings from method arguments
 */
function extractStringsFromArgs(argsContent: string): string[] {
  const strings: string[] = [];
  let inString = false;
  let currentString = '';
  let escapeNext = false;

  for (let i = 0; i < argsContent.length; i++) {
    const char = argsContent[i];

    if (escapeNext) {
      currentString += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      currentString += char;
      continue;
    }

    if (char === '"') {
      if (inString) {
        strings.push(currentString);
        currentString = '';
        inString = false;
      } else {
        inString = true;
      }
    } else if (inString) {
      currentString += char;
    }
  }

  return strings;
}

/**
 * Extract expected warnings count
 */
function extractExpectedWarnings(content: string): number {
  const pattern = /public\s+int\s+expectedWarnings\s*\(\s*\)\s*\{[^}]*return\s+(\d+);/s;
  const match = content.match(pattern);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract class name from file
 */
function extractClassName(content: string): string | null {
  const pattern = /public\s+class\s+(\w+)\s+implements\s+StackTraceForTest/;
  const match = content.match(pattern);
  return match ? match[1] : null;
}

/**
 * Check if the file is a concrete test class (not abstract or interface)
 */
function isConcreteTestClass(content: string): boolean {
  // Skip interfaces
  if (content.includes('public interface StackTraceForTest')) {
    return false;
  }

  // Skip abstract classes
  if (content.includes('public abstract class')) {
    return false;
  }

  // Skip test runner classes
  if (content.includes('StackTraceRegularExpressionParserTests')) {
    return false;
  }

  // Must implement StackTraceForTest
  return content.includes('implements StackTraceForTest');
}

/**
 * Parse a single Java test file
 */
function parseJavaTestFile(filePath: string): TestData | null {
  const content = readFileSync(filePath, 'utf-8');

  // Skip non-concrete test classes
  if (!isConcreteTestClass(content)) {
    return null;
  }

  const className = extractClassName(content);
  if (!className) {
    console.error(`Could not extract class name from ${filePath}`);
    return null;
  }

  const obfuscatedStackTrace = extractStringArray(content, 'obfuscatedStackTrace');
  if (!obfuscatedStackTrace) {
    console.error(`Could not extract obfuscatedStackTrace from ${filePath}`);
    return null;
  }

  const retracedStackTrace = extractStringArray(content, 'retracedStackTrace');
  if (!retracedStackTrace) {
    console.error(`Could not extract retracedStackTrace from ${filePath}`);
    return null;
  }

  const retraceVerboseStackTrace = extractStringArray(content, 'retraceVerboseStackTrace');

  const mapping = extractMapping(content);
  if (mapping === null) {
    console.error(`Could not extract mapping from ${filePath}`);
    return null;
  }
  // Empty string is valid for some tests

  const expectedWarnings = extractExpectedWarnings(content);

  return {
    name: className,
    obfuscatedStackTrace,
    retracedStackTrace,
    retraceVerboseStackTrace: retraceVerboseStackTrace || undefined,
    mapping,
    expectedWarnings,
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert test data to XML format
 */
function generateXml(testData: TestData): string {
  const lines: string[] = [];

  lines.push(`<test name="${escapeXml(testData.name)}" expectedWarnings="${testData.expectedWarnings}">`);

  // Obfuscated stack trace
  lines.push('  <obfuscated>');
  testData.obfuscatedStackTrace.forEach(line => {
    lines.push(`    <line>${escapeXml(line)}</line>`);
  });
  lines.push('  </obfuscated>');

  // Mapping
  lines.push('  <mapping>');
  testData.mapping.split('\n').forEach(line => {
    if (line.trim()) {
      lines.push(`    <line>${escapeXml(line)}</line>`);
    }
  });
  lines.push('  </mapping>');

  // Retraced stack trace (regular)
  lines.push('  <retraced>');
  testData.retracedStackTrace.forEach(line => {
    lines.push(`    <line>${escapeXml(line)}</line>`);
  });
  lines.push('  </retraced>');

  // Retraced stack trace (verbose) - optional
  if (testData.retraceVerboseStackTrace) {
    lines.push('  <retracedVerbose>');
    testData.retraceVerboseStackTrace.forEach(line => {
      lines.push(`    <line>${escapeXml(line)}</line>`);
    });
    lines.push('  </retracedVerbose>');
  }

  lines.push('</test>');

  return lines.join('\n');
}

/**
 * Main function
 */
function main() {
  const fixturesDir = join(__dirname, '..', 'src', 'fixtures');
  const outputDir = join(__dirname, '..', 'src', 'fixtures', 'xml');

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Get all Java files
  const javaFiles = readdirSync(fixturesDir)
    .filter(f => f.endsWith('.java'))
    .map(f => join(fixturesDir, f));

  console.log(`Found ${javaFiles.length} Java test files`);

  let successCount = 0;
  let failCount = 0;

  // Parse each file and generate XML
  for (const javaFile of javaFiles) {
    const testData = parseJavaTestFile(javaFile);

    if (testData) {
      const xml = generateXml(testData);
      const outputFile = join(outputDir, `${testData.name}.xml`);
      writeFileSync(outputFile, xml, 'utf-8');
      console.log(`✓ Generated ${testData.name}.xml`);
      successCount++;
    } else {
      console.error(`✗ Failed to parse ${javaFile}`);
      failCount++;
    }
  }

  console.log(`\nSummary: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
