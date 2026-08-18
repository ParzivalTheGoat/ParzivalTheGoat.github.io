import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { findDesignViolations } from './design-guard.mjs';

const roots = ['src', 'dist'];
const extensions = new Set(['.astro', '.css', '.html']);
const generatedSearchDirectory = join('dist', 'pagefind');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }));
  return nested.flat();
}

const files = (await Promise.all(roots.map(walk))).flat()
  .filter((file) => extensions.has(extname(file)) && !file.startsWith(generatedSearchDirectory));
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  violations.push(...findDesignViolations(relative(process.cwd(), file), source));
}

if (violations.length > 0) {
  console.error(JSON.stringify(violations, null, 2));
  process.exitCode = 1;
}
