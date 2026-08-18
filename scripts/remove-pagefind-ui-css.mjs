import { readdir, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';

const directory = join('dist', 'pagefind');
const entries = await readdir(directory, { withFileTypes: true });

await Promise.all(entries
  .filter((entry) => entry.isFile() && extname(entry.name) === '.css')
  .map((entry) => rm(join(directory, entry.name))));
