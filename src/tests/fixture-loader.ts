import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestFixture {
  name: string;
  expectedWarnings: number;
  obfuscated: string;
  mapping: string;
  retraced: string;
  retracedVerbose: string;
}

/**
 * Parse a single XML fixture file
 */
export function parseXmlFixture(xmlContent: string): TestFixture {
  // Extract the test name and expectedWarnings from the <test> tag
  const testMatch = xmlContent.match(
    /<test\s+name="([^"]+)"\s+expectedWarnings="(\d+)"/
  );
  if (!testMatch) {
    throw new Error('Invalid XML: missing test element with name and expectedWarnings');
  }

  const name = testMatch[1];
  const expectedWarnings = parseInt(testMatch[2], 10);

  // Helper function to extract lines from a section
  const extractLines = (sectionName: string): string => {
    const sectionRegex = new RegExp(
      `<${sectionName}>([\\s\\S]*?)</${sectionName}>`,
      'm'
    );
    const sectionMatch = xmlContent.match(sectionRegex);
    if (!sectionMatch) {
      return '';
    }

    const sectionContent = sectionMatch[1];
    const lineMatches = sectionContent.matchAll(/<line>(.*?)<\/line>/gs);
    const lines: string[] = [];

    for (const match of lineMatches) {
      let line = match[1];
      // Decode XML entities
      line = line
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      // Handle escaped characters
      line = line.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
      lines.push(line);
    }

    return lines.join('\n');
  };

  const obfuscated = extractLines('obfuscated');
  const mapping = extractLines('mapping');
  const retraced = extractLines('retraced');
  const retracedVerbose = extractLines('retracedVerbose');

  return {
    name,
    expectedWarnings,
    obfuscated,
    mapping,
    retraced,
    retracedVerbose,
  };
}

/**
 * Load all XML fixtures from the fixtures/xml directory
 */
export function loadAllFixtures(): TestFixture[] {
  const fixturesDir = join(__dirname, '../fixtures/xml');
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.xml'));

  return files.map((file) => {
    const filePath = join(fixturesDir, file);
    const content = readFileSync(filePath, 'utf-8');
    return parseXmlFixture(content);
  });
}

/**
 * Load a single fixture by name
 */
export function loadFixture(name: string): TestFixture {
  const fixturesDir = join(__dirname, '../fixtures/xml');
  const filePath = join(fixturesDir, `${name}.xml`);
  const content = readFileSync(filePath, 'utf-8');
  return parseXmlFixture(content);
}
