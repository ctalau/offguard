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
 * Extract string array from Java list construction
 */
function extractStringArray(content: string, methodName: string): string[] | null {
  // Check for special cases first: return obfuscatedStackTrace(), return null, or fail()
  const specialPattern = new RegExp(
    `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*(?:fail\\s*\\(\\s*\\)|return\\s+(?:obfuscatedStackTrace\\s*\\(\\s*\\)|null))`,
    's'
  );
  const specialMatch = content.match(specialPattern);
  if (specialMatch) {
    if (specialMatch[0].includes('fail()')) {
      // Methods that call fail() - return empty to skip
      return [];
    }
    if (specialMatch[0].includes('obfuscatedStackTrace')) {
      // Recursively get obfuscatedStackTrace
      return extractStringArray(content, 'obfuscatedStackTrace');
    }
    if (specialMatch[0].includes('null')) {
      // For null returns, return empty array
      return [];
    }
  }

  // Match the method and its return statement
  // Use a more greedy pattern to capture everything including newlines until the closing );
  const patterns = [
    // Arrays.asList(...) - match until we find );
    new RegExp(
      `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*return\\s+Arrays\\.asList\\s*\\(([\\s\\S]+?)\\);`,
      ''
    ),
    // ImmutableList.of(...)
    new RegExp(
      `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*return\\s+ImmutableList\\.of\\s*\\(([\\s\\S]+?)\\);`,
      ''
    ),
    // Collections.singletonList(...)
    new RegExp(
      `public\\s+List<String>\\s+${methodName}\\s*\\(\\s*\\)\\s*\\{[^}]*return\\s+Collections\\.singletonList\\s*\\(([\\s\\S]+?)\\);`,
      ''
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

  if (!argsContent) {
    return null;
  }

  return extractStringsFromArgs(argsContent);
}

/**
 * Extract mapping string from StringUtils.lines(...), StringUtils.joinLines(...), or string literal
 */
function extractMapping(content: string): string | null {
  // Match the mapping() method
  const pattern = /public\s+String\s+mapping\s*\(\s*\)\s*\{[^}]*return\s+([^;]+);/s;
  const match = content.match(pattern);

  if (!match) return null;

  const returnValue = match[1].trim();

  // Check for r8MappingFromGitSha() - these need external files
  if (returnValue.includes('r8MappingFromGitSha')) {
    return null;
  }

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
      return stringMatch[1];
    }
  }

  // Handle empty string explicitly
  if (returnValue === '""') {
    return '';
  }

  return null;
}

/**
 * Extract strings from method arguments, handling concatenation
 */
function extractStringsFromArgs(argsContent: string): string[] {
  // First, handle string concatenation by collapsing + operators
  // This handles cases like: "part1" + " part2" + " part3"
  const collapsed = collapseStringConcatenation(argsContent);

  const strings: string[] = [];
  let inString = false;
  let currentString = '';
  let escapeNext = false;

  for (let i = 0; i < collapsed.length; i++) {
    const char = collapsed[i];

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

  // Filter out null entries
  return strings.filter(s => s !== 'null');
}

/**
 * Collapse string concatenation: "a" + "b" + "c" -> "abc"
 */
function collapseStringConcatenation(input: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  let currentString = '';
  const strings: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escapeNext) {
      currentString += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
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

        // Look ahead to see if there's a + for concatenation
        let j = i + 1;
        while (j < input.length && /\s/.test(input[j])) j++;
        if (j < input.length && input[j] === '+') {
          // Skip the +
          i = j;
          // Skip whitespace after +
          while (i + 1 < input.length && /\s/.test(input[i + 1])) i++;
        } else {
          // Not concatenation, output the accumulated string
          if (strings.length > 0) {
            result += '"' + strings.join('') + '"';
            strings.length = 0;
          }
          result += input.slice(inString ? i : i, j);
          i = j - 1;
        }
      } else {
        // Start of string
        inString = true;
      }
    } else if (inString) {
      currentString += char;
    } else if (strings.length === 0) {
      // Not in concatenation mode, copy as-is
      result += char;
    }
  }

  // Flush any remaining strings
  if (strings.length > 0) {
    result += '"' + strings.join('') + '"';
  }

  return result;
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

  // Skip classes that extend ActualBotStackTraceBase (they need external mapping files)
  if (content.includes('extends ActualBotStackTraceBase')) {
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
  if (!obfuscatedStackTrace || obfuscatedStackTrace.length === 0) {
    console.error(`Could not extract obfuscatedStackTrace from ${filePath}`);
    return null;
  }

  let retracedStackTrace = extractStringArray(content, 'retracedStackTrace');
  // If retracedStackTrace is empty (from fail() or null return), use obfuscatedStackTrace
  // This handles negative test cases like NullStackTrace
  if (!retracedStackTrace || retracedStackTrace.length === 0) {
    retracedStackTrace = obfuscatedStackTrace;
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
    retraceVerboseStackTrace: retraceVerboseStackTrace && retraceVerboseStackTrace.length > 0 ? retraceVerboseStackTrace : undefined,
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
  if (testData.mapping) {
    testData.mapping.split('\n').forEach(line => {
      if (line.trim()) {
        lines.push(`    <line>${escapeXml(line)}</line>`);
      }
    });
  }
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
  let skippedCount = 0;

  // Parse each file and generate XML
  for (const javaFile of javaFiles) {
    const testData = parseJavaTestFile(javaFile);

    if (testData === null) {
      const content = readFileSync(javaFile, 'utf-8');
      if (!isConcreteTestClass(content)) {
        skippedCount++;
      } else {
        console.error(`✗ Failed to parse ${javaFile}`);
        failCount++;
      }
    } else {
      const xml = generateXml(testData);
      const outputFile = join(outputDir, `${testData.name}.xml`);
      writeFileSync(outputFile, xml, 'utf-8');
      console.log(`✓ Generated ${testData.name}.xml`);
      successCount++;
    }
  }

  console.log(`\nSummary: ${successCount} succeeded, ${failCount} failed, ${skippedCount} skipped`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main();
