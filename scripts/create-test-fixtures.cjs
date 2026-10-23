const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

(async () => {
  const destination = path.resolve('.private/fixtures');
  fs.mkdirSync(destination, { recursive: true });
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const titles = ['回到渡口', '纸上的日期', '灯亮起来'];
  const opening = ['林遥在旧渡口停下，想起上次离开时忘记拿走的笔记。江边的木牌仍朝向南方。', '纸上写着一个日期。她没有立即翻到后面，而是先找到了那天留下的原句。', '天色渐暗，渡口的灯依次亮起。她把刚刚读到的位置记下来，准备下次继续。'];
  zip.file('OPS/book.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">jianxu-original-fixture</dc:identifier><dc:title>渡口手记 · 原创测试书</dc:title><dc:creator>简续测试</dc:creator><dc:language>zh-CN</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${titles.map((_, i) => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${titles.map((_, i) => `<itemref idref="c${i}"/>`).join('')}</spine></package>`);
  zip.file('OPS/nav.xhtml', `<html xmlns="http://www.w3.org/1999/xhtml"><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol>${titles.map((title, i) => `<li><a href="c${i}.xhtml">${title}</a></li>`).join('')}</ol></nav></body></html>`);
  titles.forEach((title, i) => zip.file(`OPS/c${i}.xhtml`, `<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><h1>${title}</h1>${Array.from({ length: 18 }, (_, n) => `<p id="p${n}">${opening[i]} 这是本章第 ${n + 1} 处阅读位置，用于检查连续滚动、字号变化与中断恢复。</p>`).join('')}<p><a href="c${(i + 1) % 3}.xhtml">继续查看下一章原文</a></p></body></html>`));
  fs.writeFileSync(path.join(destination, 'jianxu-original.epub'), await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>'];
  const stream = page => `BT /F1 24 Tf 40 520 Td (Jianxu original PDF) Tj 0 -50 Td /F1 16 Tf (Page ${page} - preserve layout) Tj 0 -40 Td (Scroll, zoom, bookmark, resume.) Tj ET 0.1 0.4 0.3 rg 40 100 320 180 re f`;
  objects.push(`<< /Length ${stream(1).length} >>\nstream\n${stream(1)}\nendstream`, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>', `<< /Length ${stream(2).length} >>\nstream\n${stream(2)}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf = '%PDF-1.4\n', offsets = [0];
  objects.forEach((value, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${value}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  fs.writeFileSync(path.join(destination, 'jianxu-original.pdf'), pdf);
  console.log(destination);
})();
