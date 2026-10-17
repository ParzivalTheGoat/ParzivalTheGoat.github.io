import '@fontsource-variable/newsreader/wght.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './style.css';

import { api } from './api.js';
import { icons } from './icons.js';
import { createEditor, emptyPrompts, removeEmptyPrompts } from './editor.js';
import { PROMPT_HINTS } from '../lib/templates.mjs';

const $ = (selector) => document.querySelector(selector);
const fields = {
  title: $('#title'),
  description: $('#description'),
  category: $('#category'),
  tags: $('#tags'),
  tagInput: $('#tag-input'),
  publishedAt: $('#published-at'),
  slug: $('#slug'),
};

const state = {
  posts: [],
  current: null, // { slug, meta, body }
  dirty: false,
  saving: null,
  savedAt: null,
};

let toastTimer;
function toast(message, tone = 'ok') {
  const element = $('#toast');
  const icon = { ok: icons.check, error: icons.alert, info: icons.info }[tone];
  const text = document.createElement('span');
  text.textContent = message;
  element.innerHTML = icon;
  element.append(text);
  element.dataset.tone = tone;
  // 先收起再弹出，连续提示时每条都有入场动画。
  element.classList.remove('visible');
  void element.offsetWidth;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), tone === 'error' ? 8000 : 3500);
}

function statusDot(kind) {
  const dot = document.createElement('span');
  dot.className = 'status-dot';
  dot.dataset.kind = kind;
  return dot;
}

// 状态文字变了才播一次上浮动画，避免每次重绘都在跳。
function setStatusText(element, text) {
  if (element.dataset.text === text) {
    const existing = element.querySelector('.status-text');
    existing?.classList.remove('changed');
    return existing;
  }
  element.dataset.text = text;
  const span = document.createElement('span');
  span.className = 'status-text changed';
  span.textContent = text;
  return span;
}

const formatBytes = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);
const formatTime = (date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

/* ---------- 编辑器 ---------- */

const editor = createEditor({
  element: $('#editor'),
  bubble: $('#bubble'),
  slash: $('#slash'),
  hints: PROMPT_HINTS,
  onChange: () => markDirty(),
  uploadImage: async (file) => {
    const result = await api.uploadImage(state.current.slug, file);
    toast(`图片已压缩：${formatBytes(result.before)} → ${formatBytes(result.after)}`);
    return result.url;
  },
  onError: (message) => toast(message, 'error'),
});

/* ---------- 文章列表 ---------- */

let listRendered = false;
function renderList() {
  const list = $('#post-list');
  list.replaceChildren();
  // 只在第一次出现时逐行浮入，之后切换文章不再重播。
  list.classList.toggle('entering', !listRendered);
  let index = 0;
  const groups = [
    ['草稿', state.posts.filter((post) => post.draft)],
    ['已发布', state.posts.filter((post) => !post.draft)],
  ];
  for (const [label, posts] of groups) {
    if (posts.length === 0) continue;
    const heading = document.createElement('h3');
    heading.textContent = label;
    heading.style.setProperty('--i', index++);
    list.append(heading);
    for (const post of posts) {
      const link = document.createElement('a');
      link.href = `#${post.slug}`;
      link.className = 'post-link';
      if (state.current?.slug === post.slug) link.setAttribute('aria-current', 'page');
      const title = document.createElement('span');
      title.textContent = post.title || '无标题';
      title.className = post.title ? '' : 'untitled';
      const date = document.createElement('time');
      date.textContent = post.publishedAt.slice(5).replace('-', '/');
      link.append(title, date);
      link.style.setProperty('--i', index++);
      list.append(link);
    }
  }
  if (state.posts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'rail-empty';
    empty.textContent = '一篇都还没有';
    list.append(empty);
  }
  if (state.posts.length) listRendered = true;
}

async function refreshList() {
  state.posts = await api.listPosts();
  renderList();
}

/* ---------- 打开、保存 ---------- */

function readMeta() {
  return {
    ...state.current.meta,
    title: fields.title.value.trim(),
    description: fields.description.value.trim(),
    category: fields.category.value,
    publishedAt: fields.publishedAt.value,
  };
}

function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function renderTags() {
  fields.tags.querySelectorAll('.tag').forEach((node) => node.remove());
  for (const tag of state.current.meta.tags) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'tag';
    chip.title = '点一下删除';
    chip.textContent = `#${tag}`;
    chip.addEventListener('click', () => {
      state.current.meta.tags = state.current.meta.tags.filter((item) => item !== tag);
      renderTags();
      markDirty();
    });
    fields.tags.insertBefore(chip, fields.tagInput);
  }
}

function renderDocState() {
  const element = $('#doc-state');
  if (!state.current) {
    element.replaceChildren();
    delete element.dataset.text;
    return;
  }
  const { draft } = state.current.meta;
  let saved = '';
  let kind = draft ? 'idle' : 'ready';
  if (state.saving) {
    saved = '正在保存';
    kind = 'running';
  } else if (state.dirty) {
    saved = '有改动';
    kind = 'pending';
  } else if (state.savedAt) {
    saved = `已保存 ${formatTime(state.savedAt)}`;
  }
  const badge = document.createElement('span');
  badge.className = draft ? 'state-draft' : 'state-live';
  badge.textContent = draft ? '草稿' : '已发布';
  const text = setStatusText(element, saved);
  element.replaceChildren(statusDot(kind), badge);
  if (text) element.append(text);
  $('[data-action="publish"]').disabled = false;
  $('[data-action="publish"]').textContent = state.current.meta.draft ? '发布' : '更新线上版本';
  $('[data-action="unpublish"]').hidden = state.current.meta.draft;
  $('[data-action="delete"]').hidden = !state.current.meta.draft;
  fields.slug.disabled = !state.current.meta.draft;
  fields.slug.title = state.current.meta.draft ? '网址发布后就固定了，现在可以改成英文短词' : '已发布的文章不能改网址';
}

function renderWordCount() {
  const text = editor.getText();
  const cjk = (text.match(/[㐀-鿿]/g) ?? []).length;
  const words = (text.replace(/[㐀-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) ?? []).length;
  $('#word-count').textContent = `${(cjk + words).toLocaleString('zh-CN')} 字`;
}

async function openPost(slug) {
  if (state.current?.slug === slug) return;
  await flush();
  let post;
  try {
    post = await api.getPost(slug);
  } catch (error) {
    toast(error.message, 'error');
    return showEmpty();
  }
  state.current = post;
  state.dirty = false;
  state.savedAt = null;
  fields.title.value = post.meta.title;
  fields.description.value = post.meta.description;
  fields.category.value = post.meta.category;
  fields.publishedAt.value = post.meta.publishedAt;
  fields.slug.value = post.slug;
  renderTags();
  editor.load(post.body);
  const sheet = $('#sheet');
  sheet.hidden = false;
  sheet.classList.remove('entering');
  void sheet.offsetWidth;
  sheet.classList.add('entering');
  $('#empty-desk').hidden = true;
  requestAnimationFrame(() => {
    autoGrow(fields.title);
    autoGrow(fields.description);
    if (!post.meta.title) fields.title.focus();
  });
  renderDocState();
  renderWordCount();
  renderList();
  try {
    localStorage.setItem('writer:last', slug);
  } catch {
    // 本地存储不可用时只是不记住上次打开的文章。
  }
}

function showEmpty() {
  state.current = null;
  $('#sheet').hidden = true;
  $('#empty-desk').hidden = false;
  $('[data-action="publish"]').disabled = true;
  $('[data-action="unpublish"]').hidden = true;
  renderDocState();
  renderList();
}

let saveTimer;
function markDirty() {
  if (!state.current) return;
  state.dirty = true;
  renderDocState();
  renderWordCount();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 800);
}

async function flush() {
  clearTimeout(saveTimer);
  if (!state.current || !state.dirty) return state.saving;
  if (state.saving) await state.saving;
  const { slug } = state.current;
  state.current.meta = readMeta();
  const payload = { meta: state.current.meta, body: editor.getMarkdown() };
  state.dirty = false;
  state.saving = api.savePost(slug, payload)
    .then(() => {
      state.savedAt = new Date();
      const entry = state.posts.find((post) => post.slug === slug);
      if (entry && (entry.title !== payload.meta.title || entry.publishedAt !== payload.meta.publishedAt)) {
        Object.assign(entry, { title: payload.meta.title, publishedAt: payload.meta.publishedAt });
        renderList();
      }
    })
    .catch((error) => {
      state.dirty = true;
      toast(`保存失败：${error.message}`, 'error');
    })
    .finally(() => {
      state.saving = null;
      renderDocState();
    });
  renderDocState();
  return state.saving;
}

/* ---------- 新建 ---------- */

function chooseTemplate() {
  $('#new-dialog').showModal();
}

async function createPost(template) {
  await flush();
  const post = await api.createPost(template);
  await refreshList();
  location.hash = post.slug;
}

/* ---------- 发布 ---------- */

function publishChecks() {
  const meta = readMeta();
  const blockers = [];
  if (!meta.title) blockers.push('还没有标题');
  if (!meta.description) blockers.push('还没有一句话摘要，它会显示在文章列表和搜索结果里');
  const empty = emptyPrompts(editor);
  return { meta, blockers, empty };
}

async function openPublishDialog() {
  await flush();
  const { meta, blockers, empty } = publishChecks();
  const body = $('#publish-body');
  body.replaceChildren();
  const confirm = $('#publish-confirm');
  $('#publish-title').textContent = meta.draft ? '发布这篇文章' : '更新线上版本';

  const summary = document.createElement('p');
  summary.className = 'publish-target';
  const name = document.createElement('strong');
  name.textContent = meta.title || '无标题';
  const url = document.createElement('code');
  url.textContent = `/posts/${state.current.slug}/`;
  summary.append(name, url);
  body.append(summary);

  if (blockers.length) {
    const list = document.createElement('ul');
    list.className = 'publish-blockers';
    for (const text of blockers) {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    }
    body.append(list);
  }

  if (empty.length) {
    const note = document.createElement('p');
    note.className = 'publish-note';
    note.textContent = `这几个提问下面还空着：${empty.join('、')}。发布时会把它们一起删掉。`;
    body.append(note);
  }

  const how = document.createElement('p');
  how.className = 'publish-note muted';
  how.textContent = '发布会把文章和图片推送到 GitHub，网站一般在几分钟内更新。';
  body.append(how);

  confirm.disabled = blockers.length > 0;
  confirm.textContent = meta.draft ? '发布上线' : '推送更新';
  $('#publish-dialog').showModal();
}

async function publish() {
  const { empty } = publishChecks();
  if (empty.length) removeEmptyPrompts(editor);
  const meta = readMeta();
  const button = $('[data-action="publish"]');
  button.disabled = true;
  button.dataset.busy = '';
  button.innerHTML = '<span class="spinner"></span><span>正在发布</span>';
  try {
    const result = await api.publish(state.current.slug, { meta, body: editor.getMarkdown() });
    state.current.meta = result.meta;
    state.dirty = false;
    state.savedAt = new Date();
    toast(result.pushed ? '已推送到 GitHub，网站稍后更新' : '已提交到本地仓库（没有找到远程仓库，未推送）');
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    delete button.dataset.busy;
    renderDocState();
    await refreshList();
    refreshSync();
  }
}

async function unpublish() {
  if (!window.confirm('撤回后网站上会删掉这篇文章，文件保留为草稿。确定撤回吗？')) return;
  await flush();
  try {
    const result = await api.unpublish(state.current.slug);
    state.current.meta = result.meta;
    toast('已撤回为草稿', 'info');
  } catch (error) {
    toast(error.message, 'error');
  }
  renderDocState();
  await refreshList();
  refreshSync();
}

async function deleteDraft() {
  if (!window.confirm('删除这篇草稿和它的图片？这一步不能撤销。')) return;
  clearTimeout(saveTimer);
  state.dirty = false;
  try {
    await api.deletePost(state.current.slug);
    state.current = null;
    await refreshList();
    location.hash = '';
    showEmpty();
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function renameSlug() {
  const to = fields.slug.value.trim().toLowerCase();
  const from = state.current.slug;
  if (to === from) return;
  await flush();
  try {
    const result = await api.rename(from, to);
    state.current.slug = result.slug;
    editor.load(result.body, { keepSelection: true });
    await refreshList();
    history.replaceState(null, '', `#${result.slug}`);
    renderList();
  } catch (error) {
    fields.slug.value = from;
    toast(error.message, 'error');
  }
}

/* ---------- 同步 ---------- */

function renderSyncLine(kind, message, { busy = false } = {}) {
  const line = $('#sync-line');
  const text = setStatusText(line, message) ?? line.querySelector('.status-text');
  text.classList.toggle('shimmer', busy);
  line.replaceChildren(statusDot(kind), text);
}

async function refreshSync() {
  try {
    const status = await api.syncStatus();
    const parts = [];
    if (status.changed) parts.push(`${status.changed} 处改动未同步`);
    if (status.ahead) parts.push(`${status.ahead} 个提交未推送`);
    if (status.behind) parts.push(`落后远程 ${status.behind} 个提交`);
    renderSyncLine(parts.length ? 'pending' : 'ready', parts.length ? parts.join('，') : `已同步 · ${status.branch}`);
  } catch (error) {
    renderSyncLine('error', `无法读取 Git 状态：${error.message}`);
  }
}

async function sync() {
  await flush();
  const button = $('[data-action="sync"]');
  button.disabled = true;
  renderSyncLine('running', '正在同步', { busy: true });
  try {
    const result = await api.sync();
    toast(result.pushed ? '草稿已同步，另一台电脑打开写作台时会自动拉取' : '已提交到本地仓库');
    await refreshList();
    if (state.current && !state.dirty) {
      const fresh = await api.getPost(state.current.slug).catch(() => null);
      if (fresh && fresh.body !== editor.getMarkdown()) {
        state.current = null;
        await openPost(fresh.slug);
      }
    }
  } catch (error) {
    toast(error.message, 'error');
  }
  button.disabled = false;
  refreshSync();
}

/* ---------- 事件 ---------- */

for (const textarea of [fields.title, fields.description]) {
  textarea.addEventListener('input', () => {
    autoGrow(textarea);
    markDirty();
  });
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      if (textarea === fields.title) fields.description.focus();
      else editor.focus();
    }
  });
}

fields.category.addEventListener('change', markDirty);
fields.publishedAt.addEventListener('change', markDirty);
fields.slug.addEventListener('change', renameSlug);
fields.slug.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') fields.slug.blur();
});

fields.tagInput.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  const value = fields.tagInput.value.trim().replace(/^#/, '');
  if ((event.key === 'Enter' || event.key === ',' || event.key === '，') && value) {
    event.preventDefault();
    if (!state.current.meta.tags.includes(value)) state.current.meta.tags.push(value);
    fields.tagInput.value = '';
    renderTags();
    markDirty();
  } else if (event.key === 'Backspace' && !fields.tagInput.value && state.current.meta.tags.length) {
    state.current.meta.tags.pop();
    renderTags();
    markDirty();
  }
});

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'new') chooseTemplate();
  if (action === 'sync') sync();
  if (action === 'publish') openPublishDialog();
  if (action === 'unpublish') unpublish();
  if (action === 'delete') deleteDraft();
});

$('#publish-dialog').addEventListener('close', () => {
  if ($('#publish-dialog').returnValue === 'confirm') publish();
});

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    flush();
  }
});

window.addEventListener('hashchange', () => {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (slug) openPost(slug);
});

window.addEventListener('beforeunload', (event) => {
  if (state.dirty || state.saving) {
    flush();
    event.preventDefault();
  }
});

const topbar = $('.topbar');
window.addEventListener('scroll', () => topbar.toggleAttribute('data-scrolled', window.scrollY > 8), { passive: true });

// 拖着图片经过正文时，正文区域亮起一圈陶土色的光。
const editorArea = $('#editor');
let dragDepth = 0;
const hasImage = (event) => [...(event.dataTransfer?.items ?? [])].some((item) => item.kind === 'file' && item.type.startsWith('image/'));
editorArea.addEventListener('dragenter', (event) => {
  if (!hasImage(event)) return;
  dragDepth += 1;
  editorArea.dataset.dropping = '';
});
editorArea.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) delete editorArea.dataset.dropping;
});
editorArea.addEventListener('drop', () => {
  dragDepth = 0;
  delete editorArea.dataset.dropping;
});

$('[data-action="sync"]').insertAdjacentHTML('afterbegin', icons.sync);
for (const button of document.querySelectorAll('[data-action="new"]')) button.insertAdjacentHTML('afterbegin', icons.plus);

/* ---------- 启动 ---------- */

const meta = await api.meta();
for (const category of meta.categories) {
  const option = document.createElement('option');
  option.value = category;
  option.textContent = category;
  fields.category.append(option);
}

const templates = $('#templates');
for (const template of meta.templates) {
  const button = document.createElement('button');
  button.className = 'template';
  button.value = template.id;
  const name = document.createElement('strong');
  name.textContent = template.name;
  const hint = document.createElement('span');
  hint.textContent = template.hint;
  const prompts = document.createElement('ol');
  for (const prompt of template.prompts) {
    const item = document.createElement('li');
    item.textContent = prompt;
    prompts.append(item);
  }
  button.append(name, hint, prompts);
  templates.append(button);
}
$('#new-dialog').addEventListener('close', () => {
  const value = $('#new-dialog').returnValue;
  if (value && value !== 'cancel') createPost(value);
});

await refreshList();
refreshSync();

let initial = decodeURIComponent(location.hash.slice(1));
if (!initial) {
  try {
    initial = localStorage.getItem('writer:last') ?? '';
  } catch {
    initial = '';
  }
}
if (initial && state.posts.some((post) => post.slug === initial)) {
  location.hash === `#${initial}` ? openPost(initial) : (location.hash = initial);
} else {
  showEmpty();
}
