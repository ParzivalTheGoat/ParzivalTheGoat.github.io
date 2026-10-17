// 手绘画板。画布用 Excalidraw，但它自带的工具栏、属性面板和菜单都藏起来，
// 换成写作台自己的一排工具，配色和按钮跟页面其他地方一致。
// 画完导出 SVG，里面嵌着画布数据，之后点这张图还能打开接着画。
import './drawing-assets.js';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  exportToSvg,
  loadFromBlob,
  newElementWith,
} from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { icons } from './icons.js';

const PAPER = '#fcfcfb';

const TOOLS = [
  { type: 'selection', icon: 'pointer', label: '选择', key: 'V' },
  { type: 'rectangle', icon: 'rect', label: '方框', key: 'R' },
  { type: 'diamond', icon: 'diamond', label: '菱形', key: 'D' },
  { type: 'ellipse', icon: 'ellipse', label: '圆', key: 'O' },
  { type: 'arrow', icon: 'arrow', label: '箭头', key: 'A' },
  { type: 'line', icon: 'line', label: '直线', key: 'L' },
  { type: 'freedraw', icon: 'pen', label: '画笔', key: 'P' },
  { type: 'text', icon: 'text', label: '文字', key: 'T' },
  { type: 'eraser', icon: 'eraser', label: '橡皮', key: 'E' },
];

// 线条颜色和对应的浅色填充，取自写作台的墨色、陶土色、灰和橄榄绿。
const COLORS = [
  { name: '墨', stroke: '#1f1e1d', fill: '#e8e6dc' },
  { name: '陶土', stroke: '#c6613f', fill: '#f6dfd4' },
  { name: '灰', stroke: '#87867f', fill: '#efeee8' },
  { name: '绿', stroke: '#5b7a3e', fill: '#e2ead8' },
];

const WIDTHS = [
  { value: 1, label: '细' },
  { value: 2, label: '中' },
  { value: 4, label: '粗' },
];

let dialog;
let root;
let api;
let session; // { resolve, dirty }

function button({ className = 'draw-button', label, icon, data = {}, text = '' }) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = className;
  element.title = label;
  element.setAttribute('aria-label', label);
  element.innerHTML = icon ? icons[icon] : '';
  if (text) element.append(text);
  Object.assign(element.dataset, data);
  return element;
}

function group(...children) {
  const element = document.createElement('div');
  element.className = 'draw-group';
  element.append(...children);
  return element;
}

function buildDialog() {
  dialog = document.createElement('dialog');
  dialog.className = 'draw-dialog';
  dialog.innerHTML = `
    <header class="draw-head">
      <div class="draw-title"><strong>画图</strong><span>拖动画框、连箭头；滚轮缩放，按住空格拖动画布</span></div>
      <div class="draw-actions">
        <button class="text-button" type="button" data-draw="cancel">取消</button>
        <button class="ink-button" type="button" data-draw="save">放进文章</button>
      </div>
    </header>
    <div class="draw-stage">
      <div class="draw-toolbar" role="toolbar" aria-label="画图工具"></div>
      <div class="draw-canvas"></div>
    </div>`;
  const toolbar = dialog.querySelector('.draw-toolbar');

  const tools = group(...TOOLS.map((tool) => button({ label: `${tool.label}（${tool.key}）`, icon: tool.icon, data: { tool: tool.type } })));
  const colors = group(...COLORS.map((color, index) => {
    const swatch = button({ className: 'draw-button draw-swatch', label: `${color.name}色`, data: { color: index } });
    swatch.style.setProperty('--swatch', color.stroke);
    return swatch;
  }));
  const fill = group(button({ label: '填充浅色', icon: 'rect', data: { fill: 'toggle' }, className: 'draw-button draw-fill' }));
  const widths = group(...WIDTHS.map((width) => {
    const element = button({ className: 'draw-button draw-width', label: `${width.label}线`, data: { width: width.value } });
    element.innerHTML = `<span style="--w:${width.value}"></span>`;
    return element;
  }));
  const roughness = group(
    button({ label: '手绘感', icon: 'sketch', data: { rough: 1 } }),
    button({ label: '工整', icon: 'straight', data: { rough: 0 } }),
  );
  const history = group(
    button({ label: '撤销（Ctrl+Z）', icon: 'undo', data: { history: 'undo' } }),
    button({ label: '重做（Ctrl+Shift+Z）', icon: 'redo', data: { history: 'redo' } }),
  );
  toolbar.append(tools, colors, fill, widths, roughness, history);

  toolbar.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target || !api) return;
    const { tool, color, fill: fillToggle, width, rough, history: step } = target.dataset;
    if (tool) api.setActiveTool({ type: tool });
    if (color !== undefined) applyStyle({ color: COLORS[Number(color)] });
    if (fillToggle) applyStyle({ fill: !hasFill(api.getAppState()) });
    if (width) applyStyle({ strokeWidth: Number(width) });
    if (rough !== undefined) applyStyle({ roughness: Number(rough) });
    if (step) pressHistory(step);
  });

  dialog.addEventListener('click', (event) => {
    const action = event.target.closest('[data-draw]')?.dataset.draw;
    if (action === 'save') save();
    if (action === 'cancel') cancel(event.target.closest('button'));
  });
  // Esc 在画布里是取消选中，不能让它把整个画板关掉。
  dialog.addEventListener('cancel', (event) => event.preventDefault());

  document.body.append(dialog);
  root = createRoot(dialog.querySelector('.draw-canvas'));
}

const hasFill = (appState) => appState.currentItemBackgroundColor !== 'transparent';
const colorOf = (stroke) => COLORS.find((color) => color.stroke === stroke) ?? COLORS[0];

// 改颜色、粗细这些：既改「接下来画的」，也改当前选中的。
function applyStyle({ color, fill, strokeWidth, roughness }) {
  const appState = api.getAppState();
  const stroke = color?.stroke ?? appState.currentItemStrokeColor;
  const filled = fill ?? hasFill(appState);
  const background = filled ? colorOf(stroke).fill : 'transparent';
  const next = {
    currentItemStrokeColor: stroke,
    currentItemBackgroundColor: background,
    currentItemFillStyle: 'solid',
    ...(strokeWidth ? { currentItemStrokeWidth: strokeWidth } : {}),
    ...(roughness !== undefined ? { currentItemRoughness: roughness } : {}),
  };
  const selected = appState.selectedElementIds;
  const elements = api.getSceneElementsIncludingDeleted().map((element) => {
    if (!selected[element.id] && !(element.containerId && selected[element.containerId])) return element;
    const patch = {};
    if (color) patch.strokeColor = stroke;
    if (color || fill !== undefined) {
      if (element.type !== 'text' && element.type !== 'line' && element.type !== 'arrow' && element.type !== 'freedraw') {
        patch.backgroundColor = filled ? colorOf(color ? stroke : element.strokeColor).fill : 'transparent';
        patch.fillStyle = 'solid';
      }
    }
    if (strokeWidth && element.type !== 'text') patch.strokeWidth = strokeWidth;
    if (roughness !== undefined && element.type !== 'text') patch.roughness = roughness;
    return Object.keys(patch).length ? newElementWith(element, patch) : element;
  });
  api.updateScene({ elements, appState: next, captureUpdate: CaptureUpdateAction.IMMEDIATELY });
}

// Excalidraw 没把撤销开放成接口，用它自己认的快捷键触发。
function pressHistory(step) {
  const canvas = dialog.querySelector('.excalidraw');
  canvas?.focus();
  const event = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, metaKey: navigator.platform.startsWith('Mac'), shiftKey: step === 'redo', bubbles: true });
  (canvas ?? document).dispatchEvent(event);
}

function syncToolbar(appState) {
  const toolbar = dialog.querySelector('.draw-toolbar');
  const active = appState.activeTool.type;
  for (const element of toolbar.querySelectorAll('[data-tool]')) element.setAttribute('aria-pressed', String(element.dataset.tool === active));
  for (const element of toolbar.querySelectorAll('[data-color]')) element.setAttribute('aria-pressed', String(COLORS[element.dataset.color].stroke === appState.currentItemStrokeColor));
  toolbar.querySelector('[data-fill]').setAttribute('aria-pressed', String(hasFill(appState)));
  toolbar.querySelector('[data-fill]').style.setProperty('--swatch', colorOf(appState.currentItemStrokeColor).fill);
  for (const element of toolbar.querySelectorAll('[data-width]')) element.setAttribute('aria-pressed', String(Number(element.dataset.width) === appState.currentItemStrokeWidth));
  for (const element of toolbar.querySelectorAll('[data-rough]')) element.setAttribute('aria-pressed', String(Number(element.dataset.rough) === appState.currentItemRoughness));
}

function close(result) {
  const { resolve } = session;
  session = null;
  dialog.classList.add('closing');
  setTimeout(() => {
    dialog.close();
    dialog.classList.remove('closing');
    root.render(null);
    api = null;
  }, 160);
  resolve(result);
}

// 画了东西还点取消，先让按钮变成「确定不要了？」，再点一次才真的关。
function cancel(target) {
  if (session.dirty && target.dataset.armed === undefined) {
    target.dataset.armed = '';
    target.textContent = '确定不要了？';
    setTimeout(() => {
      delete target.dataset.armed;
      target.textContent = '取消';
    }, 3000);
    return;
  }
  close(null);
}

async function save() {
  const elements = api.getSceneElements();
  if (elements.length === 0) return close(null);
  const saveButton = dialog.querySelector('[data-draw="save"]');
  saveButton.disabled = true;
  try {
    const svg = await exportToSvg({
      elements,
      appState: { ...api.getAppState(), exportBackground: true, viewBackgroundColor: PAPER, exportWithDarkMode: false, exportEmbedScene: true },
      files: api.getFiles(),
      exportPadding: 24,
    });
    close({ svg: new XMLSerializer().serializeToString(svg) });
  } finally {
    saveButton.disabled = false;
  }
}

/**
 * 打开画板。传入已有的 SVG 地址就接着画那张图。
 * 返回 { svg }（导出的 SVG 文本），取消时返回 null。
 */
export async function openDrawing({ from } = {}) {
  if (!dialog) buildDialog();
  if (session) return null;

  let initialData = {
    appState: {
      viewBackgroundColor: PAPER,
      currentItemStrokeColor: COLORS[0].stroke,
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'solid',
      currentItemStrokeWidth: 2,
      currentItemRoughness: 1,
      currentItemRoundness: 'sharp', // 方框默认直角
      currentItemFontFamily: FONT_FAMILY.Excalifont,
      currentItemEndArrowhead: 'arrow',
    },
  };
  if (from) {
    const blob = await (await fetch(from)).blob();
    const scene = await loadFromBlob(blob, null, null);
    initialData = { elements: scene.elements, files: scene.files, appState: { ...initialData.appState, ...pickStyle(scene.appState) }, scrollToContent: true };
  }

  dialog.querySelector('[data-draw="save"]').textContent = from ? '更新这张图' : '放进文章';
  dialog.showModal();

  return new Promise((resolve) => {
    session = { resolve, dirty: false };
    let ready = false;
    root.render(h(Excalidraw, {
      initialData,
      langCode: 'zh-CN',
      // 画布一直是浅色纸面：放进文章的就是这张纸，深色模式下也所见即所得。
      theme: 'light',
      handleKeyboardGlobally: false,
      autoFocus: true,
      UIOptions: {
        canvasActions: { changeViewBackgroundColor: false, clearCanvas: false, export: false, loadScene: false, saveToActiveFile: false, toggleTheme: false, saveAsImage: false },
        tools: { image: false },
      },
      excalidrawAPI: (instance) => {
        api = instance;
      },
      onChange: (elements, appState) => {
        if (!dialog.open) return;
        syncToolbar(appState);
        // 第一次 onChange 是载入，不算改动。
        if (ready && session) session.dirty = true;
        ready = true;
      },
    }));
  });
}

function pickStyle(appState = {}) {
  const keys = ['currentItemStrokeColor', 'currentItemBackgroundColor', 'currentItemStrokeWidth', 'currentItemRoughness', 'currentItemRoundness'];
  return Object.fromEntries(keys.filter((key) => appState[key] !== undefined).map((key) => [key, appState[key]]));
}
