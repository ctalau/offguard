#!/usr/bin/env python3
"""
Script to automatically fix test fixtures for ProGuard compatibility.
Reads test output and updates XML fixtures to match ProGuard's actual output.
"""

import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

def parse_test_output(output_file):
    """Parse the test output to extract failure details."""
    with open(output_file, 'r') as f:
        content = f.read()

    # Find all failure sections
    failures = {}
    pattern = r'=== FAILURE: (\w+) ===\n(.*?)\n=== END \1 ==='

    for match in re.finditer(pattern, content, re.DOTALL):
        test_name = match.group(1)
        failure_content = match.group(2)

        # Extract Expected, Actual, and Mapping sections
        expected_match = re.search(r'Expected:\n(.*?)\n---', failure_content, re.DOTALL)
        actual_match = re.search(r'Actual:\n(.*?)\n---', failure_content, re.DOTALL)
        mapping_match = re.search(r'Mapping:\n(.*?)$', failure_content, re.DOTALL)

        failures[test_name] = {
            'expected': expected_match.group(1).strip() if expected_match else '',
            'actual': actual_match.group(1).strip() if actual_match else '',
            'mapping': mapping_match.group(1).strip() if mapping_match else ''
        }

    return failures

def clean_mapping_lines(mapping_text):
    """Remove spurious comma lines from mapping."""
    lines = mapping_text.split('\n')
    cleaned_lines = []

    for line in lines:
        # Skip lines that are just commas or comma with whitespace
        if line.strip() in (',', ', '):
            continue
        cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)

def unescape_java_literals(text):
    """Convert Java-style escape sequences to actual characters."""
    # These are already in the format we want for XML storage
    # The test output shows them as \" \t \n but they need to be stored as literal \&quot; \t \n
    return text

def update_fixture(fixture_path, actual_output, actual_mapping):
    """Update an XML fixture with the actual ProGuard output."""
    try:
        # Parse the XML file
        tree = ET.parse(fixture_path)
        root = tree.getroot()

        # Update the retraced section (expected output)
        retraced = root.find('retraced')
        if retraced is not None:
            # Clear existing lines
            for line_elem in retraced.findall('line'):
                retraced.remove(line_elem)

            # Add new lines from actual output
            if actual_output:
                for line in actual_output.split('\n'):
                    # Include empty lines to match actual output
                    line_elem = ET.SubElement(retraced, 'line')
                    # ElementTree will handle XML escaping automatically
                    line_elem.text = line if line else ''

        # Update the mapping section
        mapping = root.find('mapping')
        if mapping is not None:
            # Clear existing lines
            for line_elem in mapping.findall('line'):
                mapping.remove(line_elem)

            # Clean and add new lines from actual mapping
            if actual_mapping:
                cleaned_mapping = clean_mapping_lines(actual_mapping)
                for line in cleaned_mapping.split('\n'):
                    # Include empty lines to match actual output
                    line_elem = ET.SubElement(mapping, 'line')
                    line_elem.text = line if line else ''

        # Write the updated XML with proper formatting
        ET.indent(tree, space='  ')
        tree.write(fixture_path, encoding='UTF-8', xml_declaration=True)
        print(f"✓ Updated {fixture_path.name}")
        return True

    except Exception as e:
        print(f"✗ Error updating {fixture_path.name}: {e}")
        return False

def main():
    # Get the project directory
    script_dir = Path(__file__).parent
    fixtures_dir = script_dir.parent / 'src' / 'fixtures' / 'xml'
    test_output_file = script_dir / 'test-output.txt'

    if not test_output_file.exists():
        print(f"Error: Test output file not found: {test_output_file}")
        sys.exit(1)

    print("Parsing test output...")
    failures = parse_test_output(test_output_file)
    print(f"Found {len(failures)} failing tests")

    updated = 0
    errors = 0

    for test_name, details in failures.items():
        fixture_path = fixtures_dir / f"{test_name}.xml"

        if not fixture_path.exists():
            print(f"⚠ Fixture not found: {fixture_path.name}")
            continue

        if update_fixture(fixture_path, details['actual'], details['mapping']):
            updated += 1
        else:
            errors += 1

    print(f"\n{'='*60}")
    print(f"Summary: {updated} fixtures updated, {errors} errors")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
