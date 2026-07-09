'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EN_PATH = path.join(ROOT, 'public/i18n/en.json');
const AR_PATH = path.join(ROOT, 'public/i18n/ar.json');

/**
 * @param {string} filePath
 * @returns {unknown}
 */
function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    const relativePath = path.relative(ROOT, filePath);
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in ${relativePath}: ${error.message}`);
    } else {
      console.error(`Failed to read ${relativePath}: ${error.message}`);
    }
    process.exit(1);
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} obj
 * @param {string} [prefix]
 * @returns {Record<string, string>}
 */
function flattenKeys(obj, prefix = '') {
  /** @type {Record<string, string>} */
  const flat = {};

  if (!isPlainObject(obj)) {
    return flat;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string') {
      flat[fullKey] = value;
      continue;
    }

    if (isPlainObject(value)) {
      Object.assign(flat, flattenKeys(value, fullKey));
      continue;
    }

    if (value !== null && value !== undefined) {
      flat[fullKey] = String(value);
    }
  }

  return flat;
}

/**
 * @param {string[]} keys
 * @param {string} label
 */
function printKeyGroup(keys, label) {
  if (keys.length === 0) {
    return;
  }

  console.error(`\n${label} (${keys.length}):`);
  for (const key of keys) {
    console.error(`  - ${key}`);
  }
}

const en = loadJson(EN_PATH);
const ar = loadJson(AR_PATH);
const enFlat = flattenKeys(en);
const arFlat = flattenKeys(ar);
const enKeys = new Set(Object.keys(enFlat));
const arKeys = new Set(Object.keys(arFlat));
const requiredKeys = new Set([...enKeys, ...arKeys]);

/** @type {string[]} */
const missing = [];
/** @type {string[]} */
const empty = [];

for (const key of [...requiredKeys].sort()) {
  const value = arFlat[key];

  if (value === undefined) {
    missing.push(key);
    continue;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    empty.push(key);
  }
}

const enOnlyKeys = [...requiredKeys].filter((key) => enKeys.has(key) && !arKeys.has(key)).sort();
const arOnlyKeys = [...requiredKeys].filter((key) => arKeys.has(key) && !enKeys.has(key)).sort();

const issueCount = missing.length + empty.length;

if (issueCount === 0) {
  console.log(
    `Arabic translation check passed (${requiredKeys.size} keys in public/i18n/ar.json and public/i18n/en.json).`
  );

  if (arOnlyKeys.length > 0) {
    console.warn(
      `\nNote: ${arOnlyKeys.length} key(s) exist only in ar.json (English parity not enforced).`
    );
  }

  process.exit(0);
}

console.error(
  `Arabic translation check failed (${issueCount} issue${issueCount === 1 ? '' : 's'})`
);
printKeyGroup(missing, 'Missing in ar.json');
printKeyGroup(empty, 'Empty in ar.json');

if (enOnlyKeys.length > 0) {
  console.warn(
    `\nKeys only in en.json (${enOnlyKeys.length}) — add Arabic translations in ar.json.`
  );
}

if (arOnlyKeys.length > 0) {
  console.warn(
    `\nKeys only in ar.json (${arOnlyKeys.length}) — consider adding English in en.json.`
  );
}

console.error('\nFiles: public/i18n/ar.json, public/i18n/en.json');
console.error('Fix: add non-empty Arabic values, then run npm run check:i18n');

process.exit(1);
