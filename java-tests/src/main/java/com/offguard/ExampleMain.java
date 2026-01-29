package com.offguard;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.LineNumberReader;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import proguard.retrace.ReTrace;

public final class ExampleMain {
    private ExampleMain() {}

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: ExampleMain <mapping_file> <stacktrace_file>");
            System.exit(1);
        }

        Path mappingFile = Path.of(args[0]);
        Path stackTraceFile = Path.of(args[1]);

        ReTrace retrace = new ReTrace(mappingFile.toFile());

        try (LineNumberReader reader = new LineNumberReader(
                new BufferedReader(Files.newBufferedReader(stackTraceFile, StandardCharsets.UTF_8)));
             PrintWriter writer = new PrintWriter(System.out)) {
            retrace.retrace(reader, writer);
        } catch (IOException ex) {
            System.err.println("Failed to retrace stack trace: " + ex.getMessage());
            System.exit(2);
        }
    }
}
