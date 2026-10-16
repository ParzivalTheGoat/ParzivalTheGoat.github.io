import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const MAX_WIDTH = 1600;
const QUALITY = 80;

// 把截图压成 WebP：最长边不超过 1600px，保留动图。
export async function compressImage(input) {
  const image = sharp(input, { animated: true });
  const { pages = 1 } = await image.metadata();
  const output = await image
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 5, ...(pages > 1 ? { loop: 0 } : {}) })
    .toBuffer();
  const name = `${createHash('sha256').update(output).digest('hex').slice(0, 12)}.webp`;
  return { name, buffer: output };
}

/**
 * 图片存储层。文章里只记 URL，存在哪由这一层决定。
 * 现在存进仓库的 public/images/posts/<slug>/，网址是 /images/posts/<slug>/<name>。
 * 以后换成 Cloudflare R2 时，实现同样的 save / list / remove / move 即可。
 */
export function createRepoImageStore(publicDirectory) {
  const prefix = '/images/posts';
  const directoryOf = (slug) => join(publicDirectory, 'images', 'posts', slug);

  return {
    prefix,
    directoryOf,
    urlOf: (slug, name) => `${prefix}/${slug}/${name}`,

    async save(slug, name, buffer) {
      const directory = directoryOf(slug);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, name), buffer);
      return this.urlOf(slug, name);
    },

    async list(slug) {
      const directory = directoryOf(slug);
      return existsSync(directory) ? readdir(directory) : [];
    },

    async remove(slug, name) {
      await rm(join(directoryOf(slug), name), { force: true });
    },

    async removeAll(slug) {
      await rm(directoryOf(slug), { recursive: true, force: true });
    },

    async move(from, to) {
      if (!existsSync(directoryOf(from))) return;
      await mkdir(join(publicDirectory, 'images', 'posts'), { recursive: true });
      await rename(directoryOf(from), directoryOf(to));
    },

    // 删掉正文里已经不再引用的图片，避免仓库越来越大。
    async prune(slug, body) {
      const removed = [];
      for (const name of await this.list(slug)) {
        if (!body.includes(this.urlOf(slug, name))) {
          await this.remove(slug, name);
          removed.push(name);
        }
      }
      if ((await this.list(slug)).length === 0) await this.removeAll(slug);
      return removed;
    },
  };
}
