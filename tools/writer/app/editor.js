import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import { Markdown } from '@tiptap/markdown';
import { NodeSelection, Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const SLASH_ITEMS = [
  { id: 'h2', label: '小标题', keys: 'h2 biaoti title', hint: '##', run: (chain) => chain.setHeading({ level: 2 }) },
  { id: 'h3', label: '次级标题', keys: 'h3 biaoti', hint: '###', run: (chain) => chain.setHeading({ level: 3 }) },
  { id: 'ul', label: '列表', keys: 'list liebiao ul', hint: '-', run: (chain) => chain.toggleBulletList() },
  { id: 'ol', label: '编号列表', keys: 'ol bianhao number', hint: '1.', run: (chain) => chain.toggleOrderedList() },
  { id: 'quote', label: '引用', keys: 'quote yinyong', hint: '>', run: (chain) => chain.setBlockquote() },
  { id: 'code', label: '代码块', keys: 'code daima', hint: '```', run: (chain) => chain.setCodeBlock() },
  { id: 'image', label: '图片', keys: 'image tupian img pic', hint: '选文件', run: null },
  { id: 'hr', label: '分割线', keys: 'hr line fenge', hint: '---', run: (chain) => chain.setHorizontalRule() },
];

const isImage = (file) => file.type.startsWith('image/');

export function createEditor({ element, bubble, slash, hints, onChange, uploadImage, onError }) {
  let loading = false;
  let slashState = null; // { from, to, items, index }

  async function insertImages(files, position) {
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const at = position ?? editor.state.selection.to;
      // 图片后面跟一个空段落并把光标放进去，粘完图接着打字不会把图片替换掉。
      editor.chain().focus().insertContentAt(at, [
        { type: 'image', attrs: { src: preview, alt: '' } },
        { type: 'paragraph' },
      ]).run();
      position = undefined;
      try {
        const url = await uploadImage(file);
        replaceImageSource(preview, url);
      } catch (error) {
        replaceImageSource(preview, null);
        onError(`图片没传上去：${error.message}`);
      } finally {
        URL.revokeObjectURL(preview);
      }
    }
  }

  function replaceImageSource(from, to) {
    const { tr } = editor.state;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'image' || node.attrs.src !== from) return;
      if (to) tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: to });
      else tr.delete(pos, pos + node.nodeSize);
    });
    editor.view.dispatch(tr);
  }

  function pickImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.addEventListener('change', () => insertImages([...input.files]));
    input.click();
  }

  /* ---------- 斜杠菜单 ---------- */

  function closeSlash() {
    slashState = null;
    slash.hidden = true;
  }

  function renderSlash() {
    slash.replaceChildren();
    slashState.items.forEach((item, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === slashState.index));
      const label = document.createElement('span');
      label.textContent = item.label;
      const hint = document.createElement('kbd');
      hint.textContent = item.hint;
      option.append(label, hint);
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        slashState.index = index;
        applySlash();
      });
      slash.append(option);
    });
    const coords = editor.view.coordsAtPos(slashState.from);
    slash.style.left = `${coords.left + window.scrollX}px`;
    slash.style.top = `${coords.bottom + window.scrollY + 6}px`;
    slash.hidden = false;
  }

  function updateSlash() {
    const { selection } = editor.state;
    const { $from } = selection;
    if (!selection.empty || $from.parent.type.name !== 'paragraph') return closeSlash();
    const before = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
    const match = before.match(/^\/([^\s/]*)$/);
    if (!match) return closeSlash();
    const query = match[1].toLowerCase();
    const items = SLASH_ITEMS.filter((item) => !query || item.label.includes(query) || item.keys.includes(query));
    if (items.length === 0) return closeSlash();
    const from = $from.pos - before.length;
    slashState = { from, to: $from.pos, items, index: Math.min(slashState?.index ?? 0, items.length - 1) };
    renderSlash();
  }

  function applySlash() {
    const { from, to, items, index } = slashState;
    const item = items[index];
    closeSlash();
    const chain = editor.chain().focus().deleteRange({ from, to });
    if (item.run) item.run(chain).run();
    else {
      chain.run();
      pickImages();
    }
  }

  /* ---------- 编辑器本体 ---------- */

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      PromptHints.configure({ hints }),
      BubbleMenu.configure({
        element: bubble,
        options: { placement: 'top', offset: 8 },
        shouldShow: ({ editor: instance, state }) => {
          if (!instance.isEditable) return false;
          if (state.selection instanceof NodeSelection) return state.selection.node.type.name === 'image';
          return !state.selection.empty && !instance.isActive('codeBlock');
        },
      }),
    ],
    editorProps: {
      attributes: { class: 'prose', spellcheck: 'false' },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])].filter(isImage);
        if (files.length === 0) return false;
        event.preventDefault();
        insertImages(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files ?? [])].filter(isImage);
        if (files.length === 0) return false;
        event.preventDefault();
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImages(files, position);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (!slashState) return false;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          const step = event.key === 'ArrowDown' ? 1 : -1;
          slashState.index = (slashState.index + step + slashState.items.length) % slashState.items.length;
          renderSlash();
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          applySlash();
          return true;
        }
        if (event.key === 'Escape') {
          closeSlash();
          return true;
        }
        return false;
      },
    },
    onUpdate: () => {
      updateSlash();
      if (!loading) onChange();
    },
    onSelectionUpdate: () => {
      updateSlash();
      syncBubble();
    },
    onBlur: () => setTimeout(closeSlash, 100),
  });

  /* ---------- 浮动格式栏 ---------- */

  const altInput = bubble.querySelector('#alt-input');

  function syncBubble() {
    const { selection } = editor.state;
    const onImage = selection instanceof NodeSelection && selection.node.type.name === 'image';
    bubble.dataset.mode = onImage ? 'image' : 'text';
    if (onImage) altInput.value = selection.node.attrs.alt ?? '';
    for (const button of bubble.querySelectorAll('[data-mark]')) {
      button.setAttribute('aria-pressed', String(editor.isActive(button.dataset.mark)));
    }
    bubble.querySelector('[data-block="h2"]').setAttribute('aria-pressed', String(editor.isActive('heading')));
    bubble.querySelector('[data-block="quote"]').setAttribute('aria-pressed', String(editor.isActive('blockquote')));
  }

  bubble.addEventListener('mousedown', (event) => {
    if (event.target !== altInput) event.preventDefault();
  });

  bubble.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const chain = editor.chain().focus();
    const mark = button.dataset.mark;
    if (mark === 'bold') chain.toggleBold().run();
    if (mark === 'italic') chain.toggleItalic().run();
    if (mark === 'code') chain.toggleCode().run();
    if (mark === 'link') {
      if (editor.isActive('link')) chain.unsetLink().run();
      else {
        const href = window.prompt('链接地址', 'https://');
        if (href && href !== 'https://') chain.setLink({ href }).run();
      }
    }
    if (button.dataset.block === 'h2') chain.toggleHeading({ level: 2 }).run();
    if (button.dataset.block === 'quote') chain.toggleBlockquote().run();
    syncBubble();
  });

  altInput.addEventListener('input', () => {
    const { selection } = editor.state;
    if (!(selection instanceof NodeSelection)) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selection.from, undefined, { ...selection.node.attrs, alt: altInput.value }));
  });
  altInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') editor.commands.focus();
  });

  return {
    focus: () => editor.commands.focus('start'),
    getText: () => editor.getText(),
    getMarkdown: () => cleanMarkdown(editor.getMarkdown()),
    load(markdown) {
      loading = true;
      editor.commands.setContent(markdown || '', { contentType: 'markdown', emitUpdate: false });
      addPromptSlots(editor);
      loading = false;
      closeSlash();
    },
    editor,
  };
}

// 模板提问下面的空段落显示灰色提示。文章很短，每次整篇重算就够了。
const PromptHints = Extension.create({
  name: 'promptHints',
  addOptions: () => ({ hints: {} }),
  addProseMirrorPlugins() {
    const { hints } = this.options;
    return [new Plugin({
      props: {
        decorations: ({ doc, selection }) => {
          const decorations = [];
          const isEmpty = (node) => node.type.name === 'paragraph' && node.content.size === 0;
          const cursorAt = selection.empty && selection.$from.depth >= 1 ? selection.$from.before(1) : -1;
          doc.forEach((node, offset, index) => {
            if (!isEmpty(node)) return;
            const previous = index > 0 ? doc.child(index - 1) : null;
            let hint = '';
            let className = 'is-empty';
            if (previous?.type.name === 'heading') hint = hints[previous.textContent] ?? '';
            else if (doc.childCount === 1) hint = '从这里开始写。输入 / 插入标题、列表、图片';
            // 光标停在空行上时才提示怎么插东西，平时不占地方。
            if (!hint && offset === cursorAt) {
              hint = '输入 / 插入标题、列表、图片，截图可以直接粘贴';
              className = 'is-empty cursor-hint';
            }
            if (hint) decorations.push(Decoration.node(offset, offset + node.nodeSize, { class: className, 'data-placeholder': hint }));
          });
          return DecorationSet.create(doc, decorations);
        },
      },
    })];
  },
});

// 每个模板提问后面补一个空段落，让光标有地方落、灰色提示能显示。
function addPromptSlots(editor) {
  const { doc, schema } = editor.state;
  const { tr } = editor.state;
  const positions = [];
  doc.forEach((node, offset, index) => {
    if (node.type.name !== 'heading') return;
    const next = index + 1 < doc.childCount ? doc.child(index + 1) : null;
    if (!next || next.type.name === 'heading') positions.push(offset + node.nodeSize);
  });
  for (const pos of positions.reverse()) tr.insert(pos, schema.nodes.paragraph.create());
  if (positions.length) {
    tr.setMeta('addToHistory', false);
    editor.view.dispatch(tr);
  }
}

// 找出下面一个字都没写的标题。
function emptyHeadings(editor) {
  const { doc } = editor.state;
  const result = [];
  doc.forEach((node, offset, index) => {
    if (node.type.name !== 'heading') return;
    let end = offset + node.nodeSize;
    let hasContent = false;
    for (let i = index + 1; i < doc.childCount; i += 1) {
      const next = doc.child(i);
      if (next.type.name === 'heading' && next.attrs.level <= node.attrs.level) break;
      if (next.type.name === 'heading' || next.textContent.trim() || next.type.name !== 'paragraph') hasContent = true;
      end += next.nodeSize;
    }
    if (!hasContent) result.push({ text: node.textContent, from: offset, to: end });
  });
  return result;
}

export function emptyPrompts(editor) {
  return emptyHeadings(editor.editor).map((item) => `「${item.text || '无标题'}」`);
}

export function removeEmptyPrompts(editor) {
  const instance = editor.editor;
  const { tr } = instance.state;
  for (const { from, to } of emptyHeadings(instance).reverse()) tr.delete(from, to);
  instance.view.dispatch(tr);
}

// 编辑器给空段落输出的 &nbsp; 不该进文章；多余空行也压掉。
function cleanMarkdown(markdown) {
  return markdown
    .split('\n')
    .filter((line) => line.trim() !== '&nbsp;')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
