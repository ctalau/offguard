package com.offguard;

import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import proguard.retrace.ReTrace;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests ProGuard ReTrace implementation using XML fixtures from R8 test cases.
 */
public class RetraceFixtureTest {

    private static final Path FIXTURES_DIR = Paths.get("../src/fixtures/xml");

    @TestFactory
    Stream<DynamicTest> testAllFixtures() throws IOException {
        List<Path> xmlFiles = Files.list(FIXTURES_DIR)
                .filter(p -> p.toString().endsWith(".xml"))
                .sorted()
                .toList();

        return xmlFiles.stream()
                .map(this::createTestForFixture);
    }

    private DynamicTest createTestForFixture(Path xmlPath) {
        String testName = xmlPath.getFileName().toString().replace(".xml", "");

        return DynamicTest.dynamicTest(testName, () -> {
            TestFixture fixture = parseFixture(xmlPath);
            runRetraceTest(fixture, false);
        });
    }

    private void runRetraceTest(TestFixture fixture, boolean verbose) throws IOException {
        // Create temporary mapping file
        File mappingFile = File.createTempFile("mapping", ".txt");
        mappingFile.deleteOnExit();

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(mappingFile))) {
            writer.write(fixture.mapping);
        }

        // Run ReTrace
        String result = runReTrace(mappingFile, fixture.obfuscated, verbose);

        // Compare results
        String expected = verbose ? fixture.retracedVerbose : fixture.retraced;

        // Normalize both strings for comparison (handle line ending differences)
        String normalizedResult = normalizeOutput(result);
        String normalizedExpected = normalizeOutput(expected);

        assertEquals(normalizedExpected, normalizedResult,
                "Retraced output doesn't match expected for " + fixture.name);
    }

    private String runReTrace(File mappingFile, String obfuscatedTrace, boolean verbose) throws IOException {
        StringWriter outputWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(outputWriter);

        StringReader inputReader = new StringReader(obfuscatedTrace);
        LineNumberReader lineReader = new LineNumberReader(inputReader);

        ReTrace reTrace = new ReTrace(mappingFile);
        reTrace.retrace(lineReader, printWriter);

        printWriter.flush();
        return outputWriter.toString();
    }

    private TestFixture parseFixture(Path xmlPath) throws DocumentException, IOException {
        SAXReader reader = new SAXReader();
        Document document = reader.read(xmlPath.toFile());
        Element root = document.getRootElement();

        TestFixture fixture = new TestFixture();
        fixture.name = root.attributeValue("name");
        fixture.expectedWarnings = Integer.parseInt(root.attributeValue("expectedWarnings", "0"));

        fixture.obfuscated = extractLines(root.element("obfuscated"));
        fixture.mapping = extractLines(root.element("mapping"));
        fixture.retraced = extractLines(root.element("retraced"));

        Element verboseElement = root.element("retracedVerbose");
        fixture.retracedVerbose = verboseElement != null ? extractLines(verboseElement) : "";

        return fixture;
    }

    private String extractLines(Element element) {
        if (element == null) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        List<Element> lines = element.elements("line");

        for (int i = 0; i < lines.size(); i++) {
            String text = lines.get(i).getText();
            sb.append(text);
            if (i < lines.size() - 1) {
                sb.append("\n");
            }
        }

        return sb.toString();
    }

    private String normalizeOutput(String output) {
        if (output == null) {
            return "";
        }
        // Remove trailing whitespace and normalize line endings
        return output.trim().replaceAll("\\r\\n", "\n");
    }

    private static class TestFixture {
        String name;
        int expectedWarnings;
        String obfuscated;
        String mapping;
        String retraced;
        String retracedVerbose;
    }
}
