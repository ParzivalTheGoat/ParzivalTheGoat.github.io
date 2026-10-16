import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function createGit(cwd, paths) {
  const run = (args) => new Promise((resolve, reject) => {
    execFile('git', args, { cwd, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.message = (stderr || stdout || error.message).trim();
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });

  // 目录不存在又从没提交过时，git 会报 pathspec 错误，这里先筛掉。
  const pathspecs = async () => {
    const result = [];
    for (const path of paths) {
      if (existsSync(join(cwd, path)) || (await run(['ls-files', '--', path]))) result.push(path);
    }
    return result;
  };

  const hasRemote = async () => (await run(['remote'])).length > 0;
  const hasUpstream = () => run(['rev-parse', '--abbrev-ref', '@{upstream}']).then(() => true, () => false);
  const branch = () => run(['rev-parse', '--abbrev-ref', 'HEAD']);

  return {
    async status() {
      const specs = await pathspecs();
      const [name, changes] = await Promise.all([
        branch(),
        specs.length ? run(['status', '--porcelain', '--', ...specs]) : '',
      ]);
      let ahead = 0;
      let behind = 0;
      try {
        const counts = await run(['rev-list', '--left-right', '--count', `HEAD...@{upstream}`]);
        [ahead, behind] = counts.split(/\s+/).map(Number);
      } catch {
        // 没有上游分支时不显示领先/落后。
      }
      return { branch: name, changed: changes ? changes.split('\n').length : 0, ahead, behind };
    },

    // 拉取另一台电脑上的改动。失败时撤销 rebase，保证工作区不会卡在一半。
    async pull() {
      if (!(await hasRemote())) return { pulled: false, reason: '没有远程仓库' };
      if (!(await hasUpstream())) return { pulled: false, reason: '当前分支还没有对应的远程分支' };
      try {
        await run(['pull', '--rebase', '--autostash']);
        return { pulled: true };
      } catch (error) {
        await run(['rebase', '--abort']).catch(() => {});
        throw new Error(`拉取失败：${error.message}`);
      }
    },

    // 只提交文章和图片目录，不碰别的文件。
    async commitAndPush(message) {
      const specs = await pathspecs();
      let staged = '';
      if (specs.length) {
        await run(['add', '--all', '--', ...specs]);
        staged = await run(['diff', '--cached', '--name-only', '--', ...specs]);
        if (staged) await run(['commit', '-m', message, '--', ...specs]);
      }
      if (!(await hasRemote())) return { committed: Boolean(staged), pushed: false };
      if (await hasUpstream()) {
        await this.pull();
        await run(['push']);
      } else {
        await run(['push', '-u', 'origin', 'HEAD']);
      }
      return { committed: Boolean(staged), pushed: true };
    },
  };
}
