// 自己画的下拉菜单、项目选择和日期选择，替换浏览器默认的 select 和 date 控件。
// 三者共用一个浮层：挂在触发按钮下方，点外面或按 Esc 收起。
import { icons } from './icons.js';

let active = null; // { panel, anchor, onKey }

function closePopover({ restoreFocus = true } = {}) {
  if (!active) return;
  const { panel, anchor, onKey } = active;
  active = null;
  document.removeEventListener('keydown', onKey, true);
  anchor.removeAttribute('aria-expanded');
  panel.classList.add('closing');
  panel.addEventListener('animationend', () => panel.remove(), { once: true });
  setTimeout(() => panel.remove(), 200);
  if (restoreFocus) anchor.focus({ preventScroll: true });
}

function openPopover(anchor, panel, onKey) {
  const reopen = active?.anchor === anchor;
  closePopover({ restoreFocus: false });
  if (reopen) return false;
  panel.classList.add('picker');
  // 打开的对话框外面的东西点不到，所以对话框里的触发按钮要把浮层放进对话框。
  const dialog = anchor.closest('dialog');
  (dialog ?? document.body).append(panel);
  const rect = anchor.getBoundingClientRect();
  const width = panel.offsetWidth;
  const left = Math.max(12, Math.min(rect.left, document.documentElement.clientWidth - width - 12));
  const origin = dialog ? dialog.getBoundingClientRect() : { left: -window.scrollX, top: -window.scrollY };
  panel.style.left = `${left - origin.left}px`;
  panel.style.top = `${rect.bottom + 6 - origin.top + (dialog?.scrollTop ?? 0)}px`;
  anchor.setAttribute('aria-expanded', 'true');
  const handler = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closePopover();
      return;
    }
    onKey?.(event);
  };
  active = { panel, anchor, onKey: handler };
  document.addEventListener('keydown', handler, true);
  return true;
}

document.addEventListener('pointerdown', (event) => {
  if (active && !active.panel.contains(event.target) && !active.anchor.contains(event.target)) closePopover({ restoreFocus: false });
});
window.addEventListener('resize', () => closePopover({ restoreFocus: false }));

// 选项列表的上下键、回车，菜单和项目选择共用。
function listNavigation(list, onPick) {
  let index = 0;
  const items = () => [...list.querySelectorAll('[role="option"]')];
  const highlight = (next) => {
    const all = items();
    if (!all.length) return;
    index = (next + all.length) % all.length;
    all.forEach((item, i) => item.toggleAttribute('data-active', i === index));
    all[index].scrollIntoView({ block: 'nearest' });
  };
  return {
    reset: () => highlight(0),
    start: () => highlight(Math.max(0, items().findIndex((item) => item.getAttribute('aria-selected') === 'true'))),
    onKey(event) {
      if (event.isComposing) return;
      if (event.key === 'ArrowDown') { event.preventDefault(); highlight(index + 1); }
      if (event.key === 'ArrowUp') { event.preventDefault(); highlight(index - 1); }
      if (event.key === 'Enter') {
        const item = items()[index];
        if (!item) return;
        event.preventDefault();
        onPick(item);
      }
    },
  };
}

function option({ label, selected, className = '', icon = '' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('role', 'option');
  button.className = `picker-option ${className}`.trim();
  if (selected) button.setAttribute('aria-selected', 'true');
  button.innerHTML = icon;
  const text = document.createElement('span');
  text.textContent = label;
  button.append(text);
  if (selected) button.insertAdjacentHTML('beforeend', icons.check);
  return button;
}

/* ---------- 下拉菜单 ---------- */

export function selectMenu(anchor, { options, value, onPick }) {
  const panel = document.createElement('div');
  panel.setAttribute('role', 'listbox');
  for (const item of options) {
    const button = option({ label: item, selected: item === value });
    button.dataset.value = item;
    panel.append(button);
  }
  const pick = (button) => {
    closePopover();
    onPick(button.dataset.value);
  };
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('[role="option"]');
    if (button) pick(button);
  });
  const nav = listNavigation(panel, pick);
  if (openPopover(anchor, panel, nav.onKey)) nav.start();
}

/* ---------- 项目：可以搜索、新建、清空 ---------- */

export function projectMenu(anchor, { projects, value, onPick }) {
  const panel = document.createElement('div');
  panel.className = 'picker-project';
  const input = document.createElement('input');
  input.className = 'picker-search';
  input.placeholder = '找一个项目，或输入新名字';
  input.spellcheck = false;
  const list = document.createElement('div');
  list.setAttribute('role', 'listbox');
  panel.append(input, list);

  const pick = (button) => {
    closePopover();
    onPick(button.dataset.value || null);
  };
  const nav = listNavigation(list, pick);

  function render() {
    const query = input.value.trim();
    list.replaceChildren();
    const matches = projects.filter((name) => name.toLowerCase().includes(query.toLowerCase()));
    for (const name of matches) {
      const button = option({ label: name, selected: name === value, icon: icons.folder });
      button.dataset.value = name;
      list.append(button);
    }
    if (query && !projects.includes(query)) {
      const button = option({ label: `新建项目「${query}」`, className: 'create', icon: icons.plus });
      button.dataset.value = query;
      list.append(button);
    }
    if (value && !query) {
      const button = option({ label: '不放进项目', className: 'clear' });
      button.dataset.value = '';
      list.append(button);
    }
    if (!list.children.length) {
      const empty = document.createElement('p');
      empty.className = 'picker-empty';
      empty.textContent = '还没有项目，输入名字就能新建';
      list.append(empty);
    }
    query ? nav.reset() : nav.start();
  }

  input.addEventListener('input', render);
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[role="option"]');
    if (button) pick(button);
  });
  if (!openPopover(anchor, panel, nav.onKey)) return;
  render();
  input.focus();
}

/* ---------- 日期 ---------- */

const pad = (n) => String(n).padStart(2, '0');
const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromISO = (text) => {
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function formatDate(text) {
  if (!text) return '';
  const date = fromISO(text);
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日 · 周${WEEKDAYS[(date.getDay() + 6) % 7]}`;
}

export function dateMenu(anchor, { value, onPick }) {
  const selected = value ? fromISO(value) : new Date();
  let view = new Date(selected.getFullYear(), selected.getMonth(), 1);
  let focusDay = selected;
  const today = toISO(new Date());

  const panel = document.createElement('div');
  panel.className = 'picker-date';
  panel.innerHTML = `
    <div class="cal-head">
      <button type="button" class="cal-nav" data-step="-1" aria-label="上个月">${icons.chevronLeft}</button>
      <strong class="cal-title" aria-live="polite"></strong>
      <button type="button" class="cal-nav" data-step="1" aria-label="下个月">${icons.chevronRight}</button>
    </div>
    <div class="cal-week">${WEEKDAYS.map((day) => `<span>${day}</span>`).join('')}</div>
    <div class="cal-grid" role="grid"></div>
    <div class="cal-foot"><button type="button" class="cal-today">今天</button></div>`;
  const grid = panel.querySelector('.cal-grid');

  function render(direction = 0) {
    panel.querySelector('.cal-title').textContent = `${view.getFullYear()} 年 ${view.getMonth() + 1} 月`;
    grid.replaceChildren();
    grid.dataset.direction = direction;
    const offset = (view.getDay() + 6) % 7;
    const start = new Date(view.getFullYear(), view.getMonth(), 1 - offset);
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = toISO(day);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cal-day';
      button.dataset.date = iso;
      button.textContent = day.getDate();
      button.tabIndex = iso === toISO(focusDay) ? 0 : -1;
      if (day.getMonth() !== view.getMonth()) button.classList.add('outside');
      if (iso === today) button.classList.add('today');
      if (iso === value) button.setAttribute('aria-selected', 'true');
      grid.append(button);
    }
    // 动画只在翻月时播一次，避免每次重绘都闪。
    if (direction) {
      grid.classList.remove('turning');
      void grid.offsetWidth;
      grid.classList.add('turning');
    }
  }

  function moveTo(day, { focus = true } = {}) {
    const monthChanged = day.getMonth() !== view.getMonth() || day.getFullYear() !== view.getFullYear();
    const direction = Math.sign(day - view);
    focusDay = day;
    if (monthChanged) {
      view = new Date(day.getFullYear(), day.getMonth(), 1);
      render(direction);
    } else {
      grid.querySelectorAll('.cal-day').forEach((button) => (button.tabIndex = button.dataset.date === toISO(day) ? 0 : -1));
    }
    if (focus) grid.querySelector(`[data-date="${toISO(day)}"]`)?.focus();
  }

  panel.addEventListener('click', (event) => {
    const step = event.target.closest('.cal-nav')?.dataset.step;
    if (step) {
      view = new Date(view.getFullYear(), view.getMonth() + Number(step), 1);
      focusDay = new Date(view);
      render(Number(step));
      return;
    }
    const day = event.target.closest('.cal-day')?.dataset.date ?? (event.target.closest('.cal-today') ? today : null);
    if (day) {
      closePopover();
      onPick(day);
    }
  });

  const onKey = (event) => {
    if (!event.target.classList?.contains('cal-day')) return;
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      moveTo(new Date(focusDay.getFullYear(), focusDay.getMonth(), focusDay.getDate() + moves[event.key]));
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      moveTo(new Date(focusDay.getFullYear(), focusDay.getMonth() + (event.key === 'PageUp' ? -1 : 1), focusDay.getDate()));
    }
  };

  if (!openPopover(anchor, panel, onKey)) return;
  render();
  grid.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
}
