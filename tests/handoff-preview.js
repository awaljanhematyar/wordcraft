/** Local capture fixture only. Does not alter game state or production styles. */
const frame=document.querySelector('#app');
for(const button of document.querySelectorAll('[data-width]'))button.addEventListener('click',()=>{frame.width=button.dataset.width;});
document.querySelector('#measure').addEventListener('click',()=>{
 const d=frame.contentDocument;const w=frame.contentWindow;
 document.querySelector('#measurement').textContent=JSON.stringify({width:w.innerWidth,height:w.innerHeight,clientWidth:d.documentElement.clientWidth,scrollWidth:d.documentElement.scrollWidth,bodyHeight:d.body.scrollHeight,tiles:d.querySelectorAll('.tile').length,keys:d.querySelectorAll('[data-key]').length,userAgent:navigator.userAgent});
});

document.querySelector('#http-check').addEventListener('click',async()=>{
 const records=await Promise.all(['../index.html','../js/main.js','../css/style.css'].map(async url=>{const response=await fetch(url,{method:'HEAD'});return{path:url,status:response.status,contentType:response.headers.get('content-type'),csp:response.headers.get('content-security-policy'),nosniff:response.headers.get('x-content-type-options')};}));
 document.querySelector('#http-result').textContent=JSON.stringify(records);
});
