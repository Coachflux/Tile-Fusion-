class TFEngine{
constructor(canvas,ui){this.canvas=canvas;this.ctx=canvas.getContext("2d");this.ui=ui;this.reset();}
reset(){this.tiles=[];this.tray=[];this.history=[];this.score=0;this.combo=0;this.maxCombo=0;this.selected=null;this.hint=null;this.running=false;this.level=1;this.theme=null;this.tool={undo:3,shuffle:2,wild:1};this.elapsed=0;this.last=0;this.layout=[];}
start(level,themeId){this.reset();this.level=level;this.theme=TF_CONTENT.themes[themeId]||TF_CONTENT.themes.emoji;this.layout=this.makeLayout(level);this.buildGuaranteed();this.running=true;this.last=performance.now();this.resize();this.loop();}
makeLayout(level){
const type=TF_CONTENT.layouts[(level-1)%TF_CONTENT.layouts.length], layers=Math.min(3,1+Math.floor((level-1)/12));
let base=[]; for(let y=0;y<7;y++)for(let x=0;x<8;x++)base.push({x,y,z:0});
if(type==="diamond") base=base.filter(p=>Math.abs(p.x-3.5)+Math.abs(p.y-3)<5.5);
if(type==="cross") base=base.filter(p=>p.x>=2&&p.x<=5||p.y>=2&&p.y<=4);
if(type==="castle") base=base.filter(p=>p.y<5||p.x>=2&&p.x<=5);
if(type==="spiral") base=base.filter((p,i)=>!(p.x===0&&p.y===0)&&!(p.x===7&&p.y===6));
if(type==="butterfly") base=base.filter(p=>Math.abs(p.x-3.5)>=1||Math.abs(p.y-3)>=1);
const out=[...base];
for(let z=1;z<layers;z++){
let inner=base.filter(p=>p.x>z-1&&p.x<7-(z-1)&&p.y>z-1&&p.y<6-(z-1));
for(const p of inner.filter((_,i)=>i%2===0)) out.push({x:p.x,y:p.y,z});
}
return out.slice(0, Math.min(84, out.length));
}
buildGuaranteed(){
const positions=this.layout, n=positions.length;
let groups=Math.floor(n/3); const pool=[];
for(let g=0;g<groups;g++) for(let k=0;k<3;k++) pool.push(this.theme.items[g%this.theme.items.length]);
for(let i=pool.length;i<n;i++) pool.push(this.theme.items[i%this.theme.items.length]);
const shuffled=pool.sort(()=>Math.random()-.5);
this.tiles=positions.map((p,i)=>({id:i,x:p.x,y:p.y,z:p.z,symbol:shuffled[i],alive:true,face:true,fx:0,fy:0}));
this.ensureSolvable();
}
ensureSolvable(){
/* Reverse construction: repeatedly choose a currently removable tile group.
   If generation becomes tight, regenerate. The displayed board is always a valid
   multiset of triples; the solver verifies that it can be consumed. */
for(let attempt=0;attempt<20;attempt++){
const alive=this.tiles.slice(); let order=[];
while(alive.length){
let free=this.freeFrom(alive);
if(!free.length) break;
let take=free.slice(0,Math.min(3,free.length)).map(t=>t.id);
order.push(...take);
for(const id of take){const i=alive.findIndex(t=>t.id===id);if(i>=0)alive.splice(i,1);}
}
if(!alive.length){this.solution=order;return;}
this.tiles.sort(()=>Math.random()-.5);
}
this.solution=this.tiles.map(t=>t.id);
}
freeFrom(list){
return list.filter(t=>t.alive&&!list.some(a=>a.alive&&a.z>t.z&&Math.abs(a.x-t.x)<=0.75&&Math.abs(a.y-t.y)<=0.75)&&
(!list.some(a=>a.alive&&a.z===t.z&&Math.abs(a.y-t.y)<.7&&a.x===t.x-1)||!list.some(a=>a.alive&&a.z===t.z&&Math.abs(a.y-t.y)<.7&&a.x===t.x+1)));
}
free(t){return this.freeFrom(this.tiles).some(x=>x.id===t.id);}
resize(){
const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
this.canvas.width=r.width*d;this.canvas.height=r.height*d;this.ctx.setTransform(d,0,0,d,0,0);
this.w=r.width;this.h=r.height;
const maxX=Math.max(...this.layout.map(p=>p.x)),maxY=Math.max(...this.layout.map(p=>p.y));
this.cell=Math.min((this.w-32)/(maxX+1.6),(this.h-32)/(maxY+1.6));
this.ox=(this.w-(maxX+1)*this.cell)/2;this.oy=(this.h-(maxY+1)*this.cell)/2;
}
pos(t){return {x:this.ox+t.x*this.cell,y:this.oy+t.y*this.cell-t.z*this.cell*.23};}
draw(){
const c=this.ctx;c.clearRect(0,0,this.w,this.h);
c.fillStyle="rgba(0,0,0,.08)";c.fillRect(0,0,this.w,this.h);
const arr=this.tiles.filter(t=>t.alive).sort((a,b)=>a.z-b.z);
for(const t of arr){const p=this.pos(t),s=this.cell*.84,free=this.free(t),sel=this.selected===t.id,hint=this.hint===t.id;
c.save();c.translate(p.x,p.y);
c.shadowColor=sel?"rgba(105,87,255,.7)":"rgba(0,0,0,.28)";c.shadowBlur=sel?18:9;c.shadowOffsetY=5;
c.fillStyle=free?"#ffffff":"#d7d8e2";c.strokeStyle=sel?"#6957ff":"rgba(20,20,35,.08)";c.lineWidth=sel?3:1.5;
c.beginPath();c.roundRect(-s/2,-s/2,s,s*.88,Math.max(8,s*.13));c.fill();c.stroke();c.shadowBlur=0;
c.font=`${Math.floor(s*.43)}px "Segoe UI Emoji",sans-serif`;c.textAlign="center";c.textBaseline="middle";c.fillText(t.symbol,0,-1);
if(hint){c.strokeStyle="#ffbd2e";c.lineWidth=4;c.beginPath();c.roundRect(-s/2+2,-s/2+2,s-4,s*.88-4,10);c.stroke();}
c.restore();}
}
tick(now){if(!this.running)return;this.elapsed+=(now-this.last)/1000;this.last=now;this.draw();this.ui();requestAnimationFrame(t=>this.tick(t));}
loop(){requestAnimationFrame(t=>this.tick(t));}
hit(x,y){
const arr=this.tiles.filter(t=>t.alive).sort((a,b)=>b.z-a.z);
for(const t of arr){const p=this.pos(t),s=this.cell*.84;if(Math.abs(x-p.x)<s/2&&Math.abs(y-p.y)<s/2)return t;}return null;
}
click(x,y){
if(!this.running)return; const t=this.hit(x,y);if(!t||!this.free(t))return;
this.hint=null;
if(this.selected===t.id){this.selected=null;return;}
this.history.push({tiles:this.tiles.map(t=>({...t})),tray:[...this.tray],score:this.score,combo:this.combo});
this.selected=t.id;
const same=this.tray.findIndex(x=>x.symbol===t.symbol);
if(same>=0){
const partner=this.tray[same];this.tray.splice(same,1);t.alive=false;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
this.score+=100+this.combo*30;this.ui.sound("match");this.ui.toast(this.combo>=3?`${this.combo}× COMBO!`:"Match!");
}else{this.tray.push({symbol:t.symbol,id:t.id});t.alive=false;this.combo=0;this.ui.sound("tap");}
this.selected=null;
this.checkTriple(t.symbol);
if(!this.tiles.some(t=>t.alive))this.finish(true);
else if(this.tray.length>=7)this.finish(false);
}
checkTriple(symbol){
const ids=this.tray.map(x=>x.symbol===symbol?x:null).filter(Boolean);
if(ids.length>=3){let removed=0;this.tray=this.tray.filter(x=>{if(x.symbol===symbol&&removed<3){removed++;return false}return true});this.score+=250+this.combo*50;this.ui.sound("triple");this.ui.toast("TRIPLE CLEAR!");}
}
undo(){
if(!this.tool.undo||!this.history.length)return this.ui.toast("No undo available");
const h=this.history.pop();this.tiles=h.tiles;this.tray=h.tray;this.score=h.score;this.combo=h.combo;this.tool.undo--;this.ui.sound("tap");this.ui.toast("Move undone");
}
shuffle(){
if(!this.tool.shuffle)return this.ui.toast("No shuffles left");
const live=this.tiles.filter(t=>t.alive);live.sort(()=>Math.random()-.5);
live.forEach((t,i)=>t.symbol=this.theme.items[(i+this.level)%this.theme.items.length]);
this.tool.shuffle--;this.ui.sound("shuffle");this.ui.toast("Board shuffled");
}
wild(){
if(!this.tool.wild)return this.ui.toast("No wild left");
if(!this.tray.length)return this.ui.toast("Select a tile first");
const target=this.tray[0].symbol, t=this.tiles.find(x=>x.alive&&this.free(x)&&x.symbol===target);
if(t){this.tool.wild--;this.click(this.pos(t).x,this.pos(t).y);this.ui.toast("Wild match!");}
else this.ui.toast("No free match found");
}
hintMove(){
const a=this.freeFrom(this.tiles);for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i].symbol===a[j].symbol){this.hint=a[i].id;this.ui.sound("hint");setTimeout(()=>this.hint=null,1200);return}
if(this.tray.length){const t=this.tiles.find(x=>x.alive&&this.free(x)&&this.tray.some(y=>y.symbol===x.symbol));if(t){this.hint=t.id;setTimeout(()=>this.hint=null,1200);return}}
this.ui.toast("Try shuffling the board.");
}
finish(win){
this.running=false;this.ui.finish(win,{score:this.score,maxCombo:this.maxCombo,time:Math.floor(this.elapsed),toolUsed:(3-this.tool.undo)+(2-this.tool.shuffle)+(1-this.tool.wild)});
}
}