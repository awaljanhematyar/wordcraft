/** Test-only same-origin viewport matrix; never imported by the app. */
const widths=[320,375,390,768,1024,1440];
const frames=widths.map(width=>{
  const section=document.createElement('section'); const heading=document.createElement('h2');heading.textContent=`${width}px`;
  const frame=document.createElement('iframe'); frame.title=`WordCraft ${width}px`;frame.dataset.width=width;frame.width=width;frame.height=1100;frame.src='../index.html';
  section.append(heading,frame);document.querySelector('#frames').append(section);return frame;
});
const originalFonts=new WeakMap();
for(const frame of frames) frame.addEventListener('load',()=>originalFonts.set(frame,Array.from(frame.contentDocument.querySelectorAll('body *')).map(el=>[el,parseFloat(frame.contentWindow.getComputedStyle(el).fontSize)])));
function measure(){
 const results=frames.map(frame=>{const d=frame.contentDocument,w=frame.contentWindow; const rect=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
 const board=d.querySelector('#board'),keyboard=d.querySelector('#keyboard'),dialog=d.querySelector('dialog[open]');
 const keys=Array.from(d.querySelectorAll('[data-key]')).map(rect);const visible=Array.from(d.querySelectorAll('button,input,select,textarea')).filter(el=>el.getClientRects().length&&(!dialog||dialog.contains(el)));
 return {width:w.innerWidth,height:w.innerHeight,scrollWidth:d.documentElement.scrollWidth,overflow:d.documentElement.scrollWidth>w.innerWidth,board:rect(board),keyboard:rect(keyboard),keyMinimumWidth:Math.min(...keys.map(r=>r.width)),keyMinimumHeight:Math.min(...keys.map(r=>r.height)),dialog:dialog?{id:dialog.id,...rect(dialog),scrollWidth:dialog.scrollWidth,clientWidth:dialog.clientWidth}:null,unnamedControls:visible.filter(el=>!el.getAttribute('aria-label')&&!el.labels?.length&&!el.textContent.trim()).map(el=>el.id),liveRegion:d.querySelector('#announcements')?.getAttribute('aria-live')};
 });
 document.querySelector('#results').textContent=JSON.stringify({scenario:document.querySelector('#scenario').value,theme:document.querySelector('#theme').value,results},null,2);
}
document.querySelector('#apply').addEventListener('click',()=>{
 const scenario=document.querySelector('#scenario').value;
 for(const frame of frames){const d=frame.contentDocument;d.querySelector('dialog[open]')?.close();frame.height=scenario==='Landscape'?360:1100;
 d.documentElement.dataset.theme=document.querySelector('#theme').value;
 for(const[el,size]of originalFonts.get(frame)||[])el.style.fontSize=`${size*(scenario.startsWith('200% text')?2:1)}px`;
 d.querySelector('#game-message').textContent=scenario==='Long message'?'Keep all revealed letters in their required positions and respect the minimum and maximum repeated-letter counts. '.repeat(4):'';
 const name={Settings:'settings',Statistics:'stats',Instructions:'help'}[scenario.replace('200% text ','')];if(name)d.querySelector(`#${name}-dialog`)?.showModal();
 }requestAnimationFrame(measure);
});
document.querySelector('#measure').addEventListener('click',measure);
