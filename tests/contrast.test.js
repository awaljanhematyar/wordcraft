import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css=readFileSync(new URL('../css/style.css',import.meta.url),'utf8');
const blocks=css.match(/^:root[^\n]+/gm);
function luminance(hex){let v=hex.slice(1);if(v.length===3)v=[...v].map(x=>x+x).join('');const rgb=[0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function ratio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const [i,block]of blocks.entries()){
 const theme=i?'light':'dark';const colors=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f0-9]+)/g)].map(m=>[m[1],m[2]]));
 test(`${theme} body, secondary, clue and action text meet 4.5:1`,()=>{
  for(const [fg,bg]of [['text','panel'],['muted','panel'],['text','key'],['accent-text','accent']])assert.ok(ratio(colors[fg],colors[bg])>=4.5,`${fg}/${bg}`);
  assert.ok(ratio('#fff',colors.absent)>=4.5,'absent clue text');
  assert.ok(ratio('#36270a',colors.gold)>=4.5,'present clue text');
 });
 test(`${theme} empty tile and key boundaries meet 3:1`,()=>{
  for(const bg of ['tile','key'])assert.ok(ratio(colors.border,colors[bg])>=3,`border/${bg}`);
 });
}
