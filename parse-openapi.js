#!/usr/bin/env node
/**
 * Script to convert JSON/YAML files to string format for OpenAPIToolsService
 * 
 * Usage:
 *   node parse-openapi.js <file.json|file.yaml>
 *   node parse-openapi.js <file.json|file.yaml> --json-string  (or --jsonString)
 *   node parse-openapi.js <file.json|file.yaml> --yaml-string  (or --yamlString)
 *   node parse-openapi.js <file.json|file.yaml> --object
 *   node parse-openapi.js <file.json|file.yaml> --escaped      (or --escapedString) - for embedding in JSON
 */

const fs = require('fs');
const yaml = require('yaml');
const path = require('path');

const filePath = process.argv[2];
const outputFormat = process.argv[3] || '--json-string';

if (!filePath) {
  console.error('Usage: node parse-openapi.js <file.json|file.yaml> [--json-string|--yaml-string|--object]');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
const ext = path.extname(filePath).toLowerCase();

// Track original format for escaped output
let originalFormat = 'json'; // 'json' or 'yaml'

// Parse file content
let parsed;
if (ext === '.json') {
  parsed = JSON.parse(content);
  originalFormat = 'json';
} else if (ext === '.yaml' || ext === '.yml') {
  parsed = yaml.parse(content);
  originalFormat = 'yaml';
} else {
  // Try JSON first, then YAML
  try {
    parsed = JSON.parse(content);
    originalFormat = 'json';
  } catch {
    parsed = yaml.parse(content);
    originalFormat = 'yaml';
  }
}

// Normalize output format (support both kebab-case and camelCase)
// Convert --jsonString to --json-string, --yamlString to --yaml-string, etc.
let normalizedFormat = outputFormat;
if (normalizedFormat.startsWith('--')) {
  // Convert camelCase to kebab-case: --jsonString -> --json-string
  normalizedFormat = normalizedFormat.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// Output in requested format
switch (normalizedFormat) {
  case '--json-string':
    // JSON string that parseToJsonObject will JSON.parse()
    console.log(JSON.stringify(parsed));
    break;
  case '--yaml-string':
    // YAML string that parseToJsonObject will yaml.parse()
    console.log(yaml.stringify(parsed));
    break;
  case '--object':
    // Pretty-printed object for direct use in JS/TS
    console.log(JSON.stringify(parsed, null, 2));
    break;
  case '--escaped':
    // Escaped string for embedding in another JSON
    // If original was YAML, escape YAML string; if JSON, escape JSON string
    if (originalFormat === 'yaml') {
      const yamlString = yaml.stringify(parsed);
      console.log(JSON.stringify(yamlString));
    } else {
      console.log(JSON.stringify(JSON.stringify(parsed)));
    }
    break;
  default:
    console.error('Unknown format:', outputFormat);
    console.error('Supported formats: --json-string (or --jsonString), --yaml-string (or --yamlString), --object, --escaped');
    process.exit(1);
}