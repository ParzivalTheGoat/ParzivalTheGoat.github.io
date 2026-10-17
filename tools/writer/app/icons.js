// 线条图标，统一 1.6 描边、跟随文字颜色。
const svg = (body) => `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;

export const icons = {
  plus: svg('<path d="M10 4.5v11M4.5 10h11"/>'),
  sync: svg('<path d="M15.5 8.5A5.6 5.6 0 0 0 5.3 6.4M4.5 11.5a5.6 5.6 0 0 0 10.2 2.1"/><path d="M5 3.8v2.9h2.9M15 16.2v-2.9h-2.9"/>'),
  check: svg('<path d="M5 10.5l3.2 3.2L15 6.8"/>'),
  alert: svg('<circle cx="10" cy="10" r="6.5"/><path d="M10 6.8v3.8M10 13.2v.1"/>'),
  info: svg('<circle cx="10" cy="10" r="6.5"/><path d="M10 9.2v4M10 6.8v.1"/>'),
};
