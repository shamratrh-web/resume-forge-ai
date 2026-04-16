import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function normalizeTokens(raw: string) {
  const seen = new Set<string>();
  return String(raw || '')
    .split(/[\r\n,;\s]+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (!token || seen.has(token)) {
        return false;
      }
      seen.add(token);
      return true;
    });
}

function collectFromObject(source: Record<string, string | undefined>) {
  const values: string[] = [];

  const preferredRaw = String(source.DEEPSEEK_TOKENS || source.DEEPSEEK_TOKEN || '').trim();
  if (preferredRaw) {
    values.push(...normalizeTokens(preferredRaw));
  }

  const keyMatches = Object.keys(source)
    .filter((key) => /^DEEPSEEK_TOKEN(?:_\d+)?$/i.test(key))
    .sort((a, b) => a.localeCompare(b));

  for (const key of keyMatches) {
    const raw = String(source[key] || '').trim();
    if (!raw) continue;
    values.push(...normalizeTokens(raw));
  }

  return Array.from(new Set(values));
}

function collectFromDotEnvFile() {
  const candidates = resolveEnvFileCandidates();
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8')) as Record<string, string>;
      const tokens = collectFromObject(parsed);
      if (tokens.length > 0) {
        return tokens;
      }
    } catch {
      // Try next candidate.
    }
  }

  return [] as string[];
}

function findProjectRoot(startDir: string) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'package.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return '';
    }
    current = parent;
  }
}

function dedupePaths(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const resolved = path.resolve(value);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    unique.push(resolved);
  }
  return unique;
}

function resolveEnvFileCandidates() {
  const explicit = String(process.env.DEEPSEEK_ENV_FILE || '').trim();
  const projectRoot = findProjectRoot(__dirname);
  const initCwd = String(process.env.INIT_CWD || '').trim();
  const cwd = process.cwd();

  const roots = dedupePaths(
    [
      explicit ? path.dirname(path.resolve(explicit)) : '',
      projectRoot,
      initCwd,
      cwd
    ].filter(Boolean) as string[]
  );

  const candidates: string[] = [];
  if (explicit) {
    candidates.push(path.resolve(explicit));
  }
  for (const root of roots) {
    candidates.push(path.join(root, '.env'));
  }

  return dedupePaths(candidates);
}

export function resolvePreferredEnvFilePath() {
  const candidates = resolveEnvFileCandidates();
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || candidates[0] || path.resolve(process.cwd(), '.env');
}

export function parseTokenList(rawTokens: string) {
  return normalizeTokens(rawTokens);
}

export function getRuntimeTokens() {
  const fromEnv = collectFromObject(process.env as Record<string, string | undefined>);
  const fromFile = collectFromDotEnvFile();
  const tokens = fromFile.length > 0 ? fromFile : fromEnv;

  if (tokens.length > 0) {
    process.env.DEEPSEEK_TOKENS = tokens.join(',');
    process.env.DEEPSEEK_TOKEN = tokens[0] || '';
  }

  return tokens;
}
