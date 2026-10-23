import type { Locator, Typography } from './types';

export function readerHtml(content: string, href: string, chapter: number, location: Locator | null, typography: Typography) {
  const palette = typography.theme === 'dark' ? ['#202724', '#ebece6', '#a3cbb8'] : typography.theme === 'paper' ? ['#f5f0e4', '#303730', '#216653'] : ['#ffffff', '#222b27', '#216653'];
  const config = JSON.stringify({ href, chapter, location }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-jianxu'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none';"><style>
  *{box-sizing:border-box}html{background:${palette[0]};color:${palette[1]};font-family:Georgia,'Noto Serif CJK SC',serif;font-size:${typography.size}px;line-height:${typography.lineHeight};overflow-wrap:anywhere}body{margin:0 auto;padding:24px 24px 80px;max-width:760px}p{margin:.9em 0}h1,h2,h3{line-height:1.4}img{display:block;max-width:100%;height:auto;margin:1em auto}table{max-width:100%;display:block;overflow:auto}pre{white-space:pre-wrap}a{color:${palette[2]};text-decoration:underline}blockquote{margin:1em 0;padding-left:1em;border-left:2px solid ${palette[2]}}.source-focus{background:#d8df9a66;outline:2px solid ${palette[2]};outline-offset:4px}::selection{background:#a7cdb299}</style></head><body>${content}<script nonce="jianxu">
  (()=>{const cfg=${config};let timer;const post=(x)=>window.ReactNativeWebView.postMessage(JSON.stringify(x));
  const blocks=()=>Array.from(document.querySelectorAll('[data-location]'));
  const locate=(el)=>({href:cfg.href,chapter:cfg.chapter,progression:Math.min(1,Math.max(0,window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))),block:Number((el?.getAttribute('data-location')||'block-0').split('-')[1]),fragment:el?.getAttribute('data-location')||'',quote:(el?.textContent||'').trim().slice(0,300)});
  const current=()=>blocks().find(e=>e.getBoundingClientRect().bottom>8)||blocks().slice(-1)[0];
  const send=()=>post({type:'position',locator:locate(current())});
  addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(send,180)},{passive:true});
  addEventListener('pagehide',send);
  document.addEventListener('selectionchange',()=>{clearTimeout(window.selectionTimer);window.selectionTimer=setTimeout(()=>{const selection=getSelection();const quote=selection?.toString().trim().slice(0,500);if(quote){let el=selection.anchorNode?.parentElement?.closest('[data-location]');post({type:'selection',quote,locator:locate(el||current())});}},350)});
  document.addEventListener('click',event=>{const a=event.target.closest('[data-link]');if(a){event.preventDefault();post({type:'link',href:a.getAttribute('data-link')});}});
  function restore(){const loc=cfg.location;if(loc){let el=blocks().find(e=>e.getAttribute('data-location')===loc.fragment)||document.getElementById(loc.fragment||'');if(!el&&loc.quote)el=blocks().find(e=>e.textContent.includes(loc.quote));if(el){el.scrollIntoView();el.classList.add('source-focus');setTimeout(()=>el.classList.remove('source-focus'),1800);}else scrollTo(0,loc.progression*Math.max(1,document.documentElement.scrollHeight-innerHeight));}send();post({type:'ready'});}
  Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve}))).then(()=>requestAnimationFrame(restore));
  })();</script></body></html>`;
}
