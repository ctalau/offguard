package com.offguard;

import proguard.retrace.ReTrace;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Standalone test runner for ProGuard ReTrace tests.
 * No external dependencies required.
 */
public class TestRunner {

    private static final Path FIXTURES_DIR = Paths.get("../src/fixtures/xml");

    private int passed = 0;
    private int failed = 0;
    private List<String> failures = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        TestRunner runner = new TestRunner();
        runner.runAllTests();
        runner.printSummary();

        // Exit with error code if any tests failed
        System.exit(runner.failed > 0 ? 1 : 0);
    }

    public void runAllTests() throws IOException {
        List<Path> xmlFiles = Files.list(FIXTURES_DIR)
                .filter(p -> p.toString().endsWith(".xml"))
                .sorted()
                .collect(Collectors.toList());

        System.out.println("Running " + xmlFiles.size() + " tests...\n");

        for (Path xmlPath : xmlFiles) {
            String testName = xmlPath.getFileName().toString().replace(".xml", "");
            runTest(testName, xmlPath);
        }
    }

    private void runTest(String testName, Path xmlPath) {
        try {
            SimpleXmlParser.TestFixture fixture = SimpleXmlParser.parseFixture(xmlPath.toString());

            // Create temporary mapping file
            File mappingFile = File.createTempFile("mapping", ".txt");
            mappingFile.deleteOnExit();

            try (BufferedWriter writer = new BufferedWriter(new FileWriter(mappingFile))) {
                writer.write(fixture.mapping);
            }

            // Run ReTrace
            String result = runReTrace(mappingFile, fixture.obfuscated);

            // Compare results
            String normalizedResult = normalizeOutput(result);
            String normalizedExpected = normalizeOutput(fixture.retraced);

            if (normalizedExpected.equals(normalizedResult)) {
                System.out.println("PASS: " + testName);
                passed++;
            } else {
                System.out.println("FAIL: " + testName);
                failed++;

                StringBuilder sb = new StringBuilder();
                sb.append("\n=== FAILURE: ").append(testName).append(" ===\n");
                sb.append("Expected:\n").append(normalizedExpected).append("\n");
                sb.append("---\nActual:\n").append(normalizedResult).append("\n");
                sb.append("---\nMapping:\n").append(fixture.mapping).append("\n");
                sb.append("=== END ").append(testName).append(" ===\n");
                failures.add(sb.toString());
            }
        } catch (Exception e) {
            System.out.println("ERROR: " + testName + " - " + e.getMessage());
            failed++;
            failures.add("\n=== ERROR: " + testName + " ===\n" + e.toString() + "\n");
        }
    }

    private String runReTrace(File mappingFile, String obfuscatedTrace) throws IOException {
        StringWriter outputWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(outputWriter);

        StringReader inputReader = new StringReader(obfuscatedTrace);
        LineNumberReader lineReader = new LineNumberReader(inputReader);

        ReTrace reTrace = new ReTrace(mappingFile);
        reTrace.retrace(lineReader, printWriter);

        printWriter.flush();
        return outputWriter.toString();
    }

    private String normalizeOutput(String output) {
        if (output == null) {
            return "";
        }
        return output.trim().replaceAll("\\r\\n", "\n");
    }

    private void printSummary() {
        System.out.println("\n" + "=".repeat(60));
        System.out.println("TEST SUMMARY");
        System.out.println("=".repeat(60));
        System.out.println("Passed: " + passed);
        System.out.println("Failed: " + failed);
        System.out.println("Total:  " + (passed + failed));
        System.out.println("=".repeat(60));

        if (!failures.isEmpty()) {
            System.out.println("\nFAILURE DETAILS:");
            for (String failure : failures) {
                System.out.println(failure);
            }
        }
    }
}
