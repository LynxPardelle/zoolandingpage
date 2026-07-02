import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import path from 'node:path';

const repoRoot = process.cwd();
const draftRoot = path.join(repoRoot, 'drafts', 'zoositioweb.com.mx');
const eventAllowlistPath = path.join(repoRoot, 'src', 'app', 'shared', 'services', 'event-orchestrator-allowlist.ts');
const valueAllowlistPath = path.join(repoRoot, 'src', 'app', 'shared', 'services', 'value-orchestrator-allowlist.ts');

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      files.push(...await listJsonFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractStringArray(source, constName) {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as\\s+const`);
  const match = source.match(pattern);
  assert.ok(match, `missing allowlist ${constName}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

async function readAllowedEventIds() {
  const source = await readFile(eventAllowlistPath, 'utf8');
  return new Set([
    ...extractStringArray(source, 'BASE_ALLOWED_EVENT_IDS'),
    ...extractStringArray(source, 'DEBUG_ALLOWED_EVENT_IDS'),
  ]);
}

async function readAllowedValueResolverIds() {
  const source = await readFile(valueAllowlistPath, 'utf8');
  return new Set(extractStringArray(source, 'DEFAULT_ALLOWED_VALUE_IDS'));
}

function splitDelimited(value, delimiter, preserveQuotes = false) {
  const tokens = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (char === '\\' && next === '"') {
      if (preserveQuotes) current += '"';
      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }
      if (preserveQuotes) current += char;
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      tokens.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  tokens.push(current);
  return tokens;
}

function parseCommand(command) {
  const trimmed = String(command ?? '').trim();
  if (!trimmed) return { id: '', rawArgs: [] };
  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return { id: trimmed, rawArgs: [] };
  const id = trimmed.slice(0, colonIdx).trim();
  const paramStr = trimmed.slice(colonIdx + 1);
  return {
    id,
    rawArgs: paramStr ? splitDelimited(paramStr, ',').map((arg) => arg.trim()) : [],
  };
}

function collectInstructionFields(value, location = '$', out = [], parentKey = '') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectInstructionFields(entry, `${location}[${index}]`, out, parentKey));
    return out;
  }
  if (!value || typeof value !== 'object') return out;

  for (const [key, entry] of Object.entries(value)) {
    const nextLocation = `${location}.${key}`;
    const isRuntimeValueInstruction = key === 'valueInstructions' && parentKey !== 'config';
    if ((key === 'eventInstructions' || isRuntimeValueInstruction) && typeof entry === 'string') {
      out.push({ kind: key, value: entry, location: nextLocation });
      continue;
    }
    collectInstructionFields(entry, nextLocation, out, key);
  }
  return out;
}

function validateEventInstructions(instructions, allowedIds, context) {
  const commands = splitDelimited(instructions, ';', true).map((entry) => entry.trim()).filter(Boolean);
  const invalid = [];
  for (const command of commands) {
    const { id } = parseCommand(command);
    if (!id || allowedIds.has(id)) continue;
    invalid.push(`${context}: unknown event command "${id}" in "${command}"`);
  }
  return invalid;
}

function validateValueInstructions(instructions, allowedResolverIds, context) {
  const commands = splitDelimited(instructions, ';', true).map((entry) => entry.trim()).filter(Boolean);
  const invalid = [];
  for (const command of commands) {
    const { id, rawArgs } = parseCommand(command);
    if (!id) continue;
    if (id !== 'set') {
      invalid.push(`${context}: unknown value command "${id}" in "${command}"`);
      continue;
    }
    const resolverId = String(rawArgs[1] ?? '').trim();
    if (!resolverId) {
      invalid.push(`${context}: missing value resolver in "${command}"`);
      continue;
    }
    if (!allowedResolverIds.has(resolverId)) {
      invalid.push(`${context}: unknown value resolver "${resolverId}" in "${command}"`);
    }
  }
  return invalid;
}

describe('draft command instruction contracts', () => {
  it('keeps Zoosite eventInstructions and valueInstructions aligned with runtime allowlists', async () => {
    const [allowedEventIds, allowedValueResolverIds, jsonFiles] = await Promise.all([
      readAllowedEventIds(),
      readAllowedValueResolverIds(),
      listJsonFiles(draftRoot),
    ]);
    const invalid = [];

    for (const filePath of jsonFiles) {
      const relativeFile = path.relative(repoRoot, filePath);
      const payload = JSON.parse(await readFile(filePath, 'utf8'));
      for (const field of collectInstructionFields(payload)) {
        const context = `${relativeFile}${field.location}`;
        if (field.kind === 'eventInstructions') {
          invalid.push(...validateEventInstructions(field.value, allowedEventIds, context));
        } else {
          invalid.push(...validateValueInstructions(field.value, allowedValueResolverIds, context));
        }
      }
    }

    assert.deepEqual(invalid, []);
  });
});
