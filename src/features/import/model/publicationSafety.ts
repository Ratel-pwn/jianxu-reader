import type JSZip from 'jszip';
import { Element, type AnyNode } from 'domhandler';

export function validateMarkup(nodes: AnyNode[]) {
  const stack = nodes.map(node => ({ node, depth: 0 }));
  let count = 0;
  while (stack.length) {
    const { node, depth } = stack.pop()!;
    if (++count > 60000 || depth > 128) throw new Error('章节结构过于复杂或层级过深');
    if (node instanceof Element) for (const child of node.children) stack.push({ node: child, depth: depth + 1 });
  }
}

export function safeInlineStyle(source = '', image = false): string {
  if (source.length > 2000) return '';
  const rules: Record<string, RegExp> = {
    'text-align': /^(left|right|center|justify|start|end)$/,
    'font-style': /^(normal|italic|oblique)$/,
    'font-weight': /^(normal|bold|[1-9]00)$/,
    'text-decoration': /^(none|underline|line-through)$/,
    'white-space': /^(normal|pre-wrap|pre-line)$/,
    'vertical-align': /^(baseline|middle|sub|super|text-top|text-bottom)$/,
    display: /^(inline|inline-block|block)$/,
    'text-indent': /^(0|[0-3](\.\d{1,2})?em)$/,
    'margin-top': /^(0|[0-3](\.\d{1,2})?em)$/,
    'margin-bottom': /^(0|[0-3](\.\d{1,2})?em)$/,
  };
  if (image) rules.width = /^(auto|100%|[1-9](\.\d{1,2})?em|[1-9]\d{0,2}px)$/;
  const accepted = new Map<string, string>();
  for (const declaration of source.split(';')) {
    const [property, value, extra] = declaration.toLowerCase().split(':').map(part => part.trim());
    if (!extra && rules[property]?.test(value || '')) accepted.set(property, value);
  }
  return [...accepted].map(([name, value]) => `${name}:${value}`).join(';');
}

// The public JSZip StreamHelper lets us stop before accumulating oversized content.
// Bounds apply to emitted characters even when archive size fields are dishonest.
export function readBoundedText(file: JSZip.JSZipObject, type: 'string' | 'binarystring', maxCharacters: number): Promise<string> {
  const stream = (file as JSZip.JSZipObject & { internalStream(type: string): JSZip.JSZipStreamHelper<string> }).internalStream(type);
  return new Promise((resolve, reject) => {
    let chunks: string[] = [], length = 0, settled = false;
    stream.on('data', chunk => {
      if (settled) return;
      length += chunk.length;
      if (length > maxCharacters) {
        settled = true; chunks = []; stream.pause(); reject(new Error('EPUB 资源或章节超过安全读取限制')); return;
      }
      chunks.push(chunk);
    }).on('error', error => { if (!settled) { settled = true; chunks = []; reject(error); } })
      .on('end', () => { if (!settled) { settled = true; resolve(chunks.join('')); chunks = []; } }).resume();
  });
}
