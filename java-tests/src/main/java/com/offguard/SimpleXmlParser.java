package com.offguard;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Simple XML parser for our test fixtures (no external dependencies).
 */
public class SimpleXmlParser {

    public static class TestFixture {
        public String name;
        public String obfuscated;
        public String mapping;
        public String retraced;
        public String retracedVerbose;
    }

    public static TestFixture parseFixture(String filePath) throws IOException {
        TestFixture fixture = new TestFixture();
        StringBuilder currentSection = new StringBuilder();
        String currentTag = null;

        try (BufferedReader reader = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();

                if (line.startsWith("<test ")) {
                    // Extract name attribute
                    int nameStart = line.indexOf("name=\"") + 6;
                    int nameEnd = line.indexOf("\"", nameStart);
                    fixture.name = line.substring(nameStart, nameEnd);
                } else if (line.equals("<obfuscated>")) {
                    currentTag = "obfuscated";
                    currentSection = new StringBuilder();
                } else if (line.equals("<mapping>")) {
                    currentTag = "mapping";
                    currentSection = new StringBuilder();
                } else if (line.equals("<retraced>")) {
                    currentTag = "retraced";
                    currentSection = new StringBuilder();
                } else if (line.equals("<retracedVerbose>")) {
                    currentTag = "retracedVerbose";
                    currentSection = new StringBuilder();
                } else if (line.equals("</obfuscated>")) {
                    fixture.obfuscated = currentSection.toString();
                    currentTag = null;
                } else if (line.equals("</mapping>")) {
                    fixture.mapping = currentSection.toString();
                    currentTag = null;
                } else if (line.equals("</retraced>")) {
                    fixture.retraced = currentSection.toString();
                    currentTag = null;
                } else if (line.equals("</retracedVerbose>")) {
                    fixture.retracedVerbose = currentSection.toString();
                    currentTag = null;
                } else if (currentTag != null && line.startsWith("<line>")) {
                    // Extract text between <line> and </line>
                    int start = line.indexOf("<line>") + 6;
                    int end = line.indexOf("</line>");
                    if (end > start) {
                        String text = line.substring(start, end);
                        // Decode XML entities
                        text = text.replace("&lt;", "<")
                                   .replace("&gt;", ">")
                                   .replace("&amp;", "&");
                        if (currentSection.length() > 0) {
                            currentSection.append("\n");
                        }
                        currentSection.append(text);
                    }
                }
            }
        }

        return fixture;
    }
}
