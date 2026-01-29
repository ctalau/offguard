package com.offguard;

import proguard.retrace.ReTrace;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Simple test runner for ProGuard ReTrace using XML fixtures (no JUnit dependency).
 */
public class RetraceTestRunner {

    private static final Path FIXTURES_DIR = Paths.get("../src/fixtures/xml");

    public static void main(String[] args) throws IOException {
        List<Path> xmlFiles = Files.list(FIXTURES_DIR)
                .filter(p -> p.toString().endsWith(".xml"))
                .sorted()
                .collect(Collectors.toList());

        int passed = 0;
        int failed = 0;
        List<String> failures = new ArrayList<>();

        System.out.println("Running " + xmlFiles.size() + " tests...\n");

        for (Path xmlPath : xmlFiles) {
            String testName = xmlPath.getFileName().toString().replace(".xml", "");
            try {
                runTest(xmlPath);
                System.out.println("✓ " + testName);
                passed++;
            } catch (AssertionError e) {
                System.out.println("✗ " + testName);
                System.out.println("  " + e.getMessage());
                failures.add(testName + ": " + e.getMessage());
                failed++;
            } catch (Exception e) {
                System.out.println("✗ " + testName + " (ERROR)");
                System.out.println("  " + e.getMessage());
                failures.add(testName + ": " + e.getClass().getSimpleName() + " - " + e.getMessage());
                failed++;
            }
        }

        System.out.println("\n" + "=".repeat(60));
        System.out.println("Results: " + passed + " passed, " + failed + " failed");

        if (!failures.isEmpty()) {
            System.out.println("\nFailures:");
            for (String failure : failures) {
                System.out.println("  - " + failure);
            }
            System.exit(1);
        }
    }

    private static void runTest(Path xmlPath) throws Exception {
        SimpleXmlParser.TestFixture fixture = SimpleXmlParser.parseFixture(xmlPath.toString());

        // Create temporary mapping file
        File mappingFile = File.createTempFile("mapping", ".txt");
        mappingFile.deleteOnExit();

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(mappingFile))) {
            writer.write(fixture.mapping);
        }

        // Run ReTrace
        String result = runReTrace(mappingFile, fixture.obfuscated, false);

        // Compare results
        String normalizedResult = normalizeOutput(result);
        String normalizedExpected = normalizeOutput(fixture.retraced);

        if (!normalizedExpected.equals(normalizedResult)) {
            throw new AssertionError("Output mismatch\nExpected:\n" + normalizedExpected + "\n\nActual:\n" + normalizedResult);
        }
    }

    private static String runReTrace(File mappingFile, String obfuscatedTrace, boolean verbose) throws IOException {
        StringWriter outputWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(outputWriter);

        StringReader inputReader = new StringReader(obfuscatedTrace);
        LineNumberReader lineReader = new LineNumberReader(inputReader);

        ReTrace reTrace = new ReTrace(mappingFile);
        reTrace.retrace(lineReader, printWriter);

        printWriter.flush();
        return outputWriter.toString();
    }

    private static String normalizeOutput(String output) {
        if (output == null) {
            return "";
        }
        // Remove trailing whitespace and normalize line endings
        return output.trim().replaceAll("\\r\\n", "\n");
    }
}
