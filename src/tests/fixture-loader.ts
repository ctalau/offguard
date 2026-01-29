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

  const sections: Record<string, string[]> = {
    obfuscated: [],
    mapping: [],
    retraced: [],
    retracedVerbose: [],
  };

  let currentTag: keyof typeof sections | null = null;

  const decodeEntities = (line: string): string =>
    line
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

  for (const rawLine of xmlContent.split('\n')) {
    const line = rawLine.trim();

    if (line === '<obfuscated>') {
      currentTag = 'obfuscated';
      continue;
    }

    if (line === '<mapping>') {
      currentTag = 'mapping';
      continue;
    }

    if (line === '<retraced>') {
      currentTag = 'retraced';
      continue;
    }

    if (line === '<retracedVerbose>') {
      currentTag = 'retracedVerbose';
      continue;
    }

    if (
      line === '</obfuscated>' ||
      line === '</mapping>' ||
      line === '</retraced>' ||
      line === '</retracedVerbose>'
    ) {
      currentTag = null;
      continue;
    }

    if (currentTag && line.startsWith('<line>') && line.endsWith('</line>')) {
      const start = line.indexOf('<line>') + 6;
      const end = line.lastIndexOf('</line>');
      if (end > start) {
        let text = decodeEntities(line.substring(start, end));

        if (currentTag !== 'mapping') {
          text = text.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
        }

        sections[currentTag].push(text);
      }
    }
  }

  const obfuscated = sections.obfuscated.join('\n');
  const mapping = sections.mapping.join('\n');
  const retraced = sections.retraced.join('\n');
  const retracedVerbose = sections.retracedVerbose.join('\n');

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
