// 线条图标，统一 1.6 描边、跟随文字颜色。
const svg = (body) => `<svg class="icon" viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;

export const icons = {
  plus: svg('<path d="M10 4.5v11M4.5 10h11"/>'),
  sync: svg('<path d="M15.5 8.5A5.6 5.6 0 0 0 5.3 6.4M4.5 11.5a5.6 5.6 0 0 0 10.2 2.1"/><path d="M5 3.8v2.9h2.9M15 16.2v-2.9h-2.9"/>'),
  check: svg('<path d="M5 10.5l3.2 3.2L15 6.8"/>'),
  alert: svg('<circle cx="10" cy="10" r="6.5"/><path d="M10 6.8v3.8M10 13.2v.1"/>'),
  info: svg('<circle cx="10" cy="10" r="6.5"/><path d="M10 9.2v4M10 6.8v.1"/>'),
  folder: svg('<path d="M3.5 6.2c0-.9.7-1.6 1.6-1.6h2.8l1.6 1.8h5.4c.9 0 1.6.7 1.6 1.6v5.9c0 .9-.7 1.6-1.6 1.6H5.1c-.9 0-1.6-.7-1.6-1.6z"/>'),
  shapes: svg('<rect x="4" y="4" width="5" height="5" rx="1"/><rect x="11" y="4" width="5" height="5" rx="2.5"/><rect x="4" y="11" width="5" height="5" rx="1"/><rect x="11" y="11" width="5" height="5" rx="1"/>'),
  hash: svg('<path d="M8 4l-1.6 12M13.6 4L12 16M4.5 7.8h11.5M4 12.2h11.5"/>'),
  calendar: svg('<rect x="3.8" y="5" width="12.4" height="11" rx="1.8"/><path d="M3.8 8.6h12.4M7.2 3.5v3M12.8 3.5v3"/>'),
  link: svg('<path d="M8.6 11.4a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.8.8M11.4 8.6a3 3 0 0 0-4.2 0l-2.3 2.3a3 3 0 0 0 4.2 4.2l.8-.8"/>'),
  chevronDown: svg('<path d="M6.5 8.5L10 12l3.5-3.5"/>'),
  chevronRight: svg('<path d="M8.5 6.5L12 10l-3.5 3.5"/>'),
  chevronLeft: svg('<path d="M11.5 6.5L8 10l3.5 3.5"/>'),
  cloud: svg('<path d="M6 15.2h8.3a3.2 3.2 0 0 0 .4-6.4 4.8 4.8 0 0 0-9.2-.9A3.7 3.7 0 0 0 6 15.2z"/>'),
};
