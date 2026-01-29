export type Fixture = {
  id: string;
  label: string;
  stack: string;
  mapping: string;
};

type XmlFixture = {
  name: string;
  obfuscated: string;
  mapping: string;
};

const decodeEntities = (line: string): string =>
  line
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const parseXmlFixture = (xmlContent: string): XmlFixture => {
  const testMatch = xmlContent.match(/<test\s+name="([^"]+)"\s+expectedWarnings="(\d+)"/);
  if (!testMatch) {
    throw new Error('Invalid XML: missing test element with name and expectedWarnings');
  }

  const name = testMatch[1];

  const sections: Record<'obfuscated' | 'mapping', string[]> = {
    obfuscated: [],
    mapping: [],
  };

  let currentTag: keyof typeof sections | null = null;

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

    if (line === '</obfuscated>' || line === '</mapping>') {
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

  return {
    name,
    obfuscated: sections.obfuscated.join('\n'),
    mapping: sections.mapping.join('\n'),
  };
};

const fixtureModules = import.meta.glob('../../src/fixtures/xml/*.xml', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const parsedFixtures = Object.values(fixtureModules).map((content) =>
  parseXmlFixture(content as string),
);

export const fixtures: Fixture[] = parsedFixtures
  .map((fixture) => ({
    id: fixture.name,
    label: fixture.name,
    stack: fixture.obfuscated,
    mapping: fixture.mapping,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
