// 生成 12 生肖像素头像 PNG（柔色底），输出到 weapp/assets/avatars/
// 运行：node weapp/scripts/gen-avatars.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 16;
const SCALE = 16; // 16x16 -> 256x256
const HEAD_MASK = [
  [6,9],[5,10],[4,11],[4,11],[3,12],[3,12],[3,12],[3,12],[4,11],[4,11],[5,10],[6,9]
];
const EYE = '#2b2b33';
const SPARK = '#ffffff';

function mix(hex, t){
  const n = parseInt(hex.slice(1),16);
  const r = n>>16, g = (n>>8)&255, b = n&255;
  const m = v => Math.round(v + (255-v)*t);
  return '#'+[m(r),m(g),m(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function rgb(hex){ const n=parseInt(hex.slice(1),16); return [n>>16,(n>>8)&255,n&255]; }

const ZODIAC = [
  { key:'rat', C:{main:'#aeb4c0',ear:'#f4b8c4',outline:'#5b6068'},
    draw(set,sym,C){
      [[1,4],[1,5],[2,3],[2,4],[2,5],[2,6],[3,4],[3,5],[3,6]].forEach(([r,c])=>sym(r,c,C.main));
      sym(2,4,C.ear); sym(2,5,C.ear);
    }},
  { key:'ox', C:{main:'#a87a4f',horn:'#efe7d6',snout:'#c79a76',outline:'#5e4126'}, noNose:true,
    draw(set,sym,C){
      [[3,3],[2,3],[1,3],[1,4]].forEach(([r,c])=>sym(r,c,C.horn));
      for(let r=11;r<=12;r++)for(let c=6;c<=7;c++)sym(r,c,C.snout);
      sym(12,6,EYE);
    }},
  { key:'tiger', C:{main:'#ef9b3d',stripe:'#6b4320',snout:'#fbe6c8',outline:'#6b4320'}, noNose:true,
    draw(set,sym,C){
      [[2,4],[2,5],[3,4],[3,5]].forEach(([r,c])=>sym(r,c,C.main));
      sym(4,7,C.stripe); sym(5,7,C.stripe); sym(6,3,C.stripe); sym(7,3,C.stripe);
      for(let r=11;r<=12;r++)for(let c=6;c<=7;c++)sym(r,c,C.snout);
      sym(11,7,EYE);
    }},
  { key:'rabbit', C:{main:'#f2ece4',ear:'#f4b8c4',outline:'#b9a78f'},
    draw(set,sym,C){
      for(let r=0;r<=4;r++){ sym(r,5,C.main); sym(r,6,C.main); }
      sym(1,6,C.ear); sym(2,6,C.ear); sym(3,6,C.ear);
    }},
  { key:'dragon', C:{main:'#5fb46f',horn:'#f3d23f',outline:'#2f6b3c'},
    draw(set,sym,C){
      [[1,4],[2,4],[2,5]].forEach(([r,c])=>sym(r,c,C.horn));
      sym(2,7,C.horn); sym(11,7,EYE);
    }},
  { key:'snake', C:{main:'#7cc257',scale:'#5a9a3f',tongue:'#e8556b',outline:'#3f7a33'},
    draw(set,sym,C){
      sym(4,7,C.scale); sym(6,4,C.scale); sym(10,5,C.scale);
      sym(15,7,C.tongue);
    }},
  { key:'horse', C:{main:'#b07a43',mane:'#6e4524',outline:'#5e3f22'},
    draw(set,sym,C){
      [[1,5],[2,5],[2,6],[3,6]].forEach(([r,c])=>sym(r,c,C.main));
      [[4,3],[5,3],[6,3]].forEach(([r,c])=>sym(r,c,C.mane));
      sym(2,7,C.mane);
    }},
  { key:'goat', C:{main:'#efe8dc',horn:'#b9a78f',outline:'#b3a48c'},
    draw(set,sym,C){
      [[3,3],[2,3],[1,4],[1,5]].forEach(([r,c])=>sym(r,c,C.horn));
      sym(13,7,C.main); sym(14,7,C.main); sym(15,7,C.main);
    }},
  { key:'monkey', C:{main:'#8a5a3a',face:'#e7b98f',outline:'#5b3a23'}, noNose:true,
    draw(set,sym,C){
      [[7,2],[8,1],[8,2],[9,2]].forEach(([r,c])=>sym(r,c,C.main));
      for(let r=9;r<=13;r++)for(let c=5;c<=7;c++)sym(r,c,C.face);
      sym(12,7,EYE);
    }},
  { key:'rooster', C:{main:'#f4f1ea',comb:'#e8556b',beak:'#f3b03f',outline:'#c0b6a6'}, noNose:true,
    draw(set,sym,C){
      [[0,7],[1,6],[1,7],[2,5],[2,6],[2,7]].forEach(([r,c])=>sym(r,c,C.comb));
      sym(11,7,C.beak); sym(12,7,C.beak); sym(13,7,C.comb);
    }},
  { key:'dog', C:{main:'#c89a64',ear:'#a87a4a',snout:'#efe2cc',outline:'#6e4f2c'}, noNose:true,
    draw(set,sym,C){
      for(let r=4;r<=9;r++){ sym(r,2,C.ear); sym(r,3,C.ear); }
      for(let r=11;r<=12;r++)for(let c=6;c<=7;c++)sym(r,c,C.snout);
      sym(11,7,EYE);
    }},
  { key:'pig', C:{main:'#f3a6b6',snout:'#ec8ba0',outline:'#cf7689'}, noNose:true,
    draw(set,sym,C){
      [[2,4],[3,4],[3,5]].forEach(([r,c])=>sym(r,c,C.main));
      for(let r=10;r<=11;r++)for(let c=6;c<=7;c++)sym(r,c,C.snout);
      sym(11,7,EYE);
    }},
];

function buildGrid(z){
  const g = Array.from({length:SIZE},()=>Array(SIZE).fill(null));
  const set = (r,c,col)=>{ if(r>=0&&r<SIZE&&c>=0&&c<SIZE) g[r][c]=col; };
  const sym = (r,c,col)=>{ set(r,c,col); set(r,SIZE-1-c,col); };
  for(let i=0;i<HEAD_MASK.length;i++){
    const r=3+i, [a,b]=HEAD_MASK[i];
    for(let c=a;c<=b;c++) g[r][c]=z.C.main;
  }
  z.draw(set,sym,z.C);
  [[8,4],[8,5],[9,4],[9,5]].forEach(([r,c])=>sym(r,c,EYE));
  sym(8,5,SPARK);
  if(!z.noNose) sym(11,7,z.C.ear || '#e08a9a');
  const out = z.C.outline;
  const base = g.map(row=>row.slice());
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
    if(base[r][c]!==null) continue;
    const nb = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    if(nb.some(([y,x])=>y>=0&&y<SIZE&&x>=0&&x<SIZE&&base[y][x]!==null)) g[r][c]=out;
  }
  return g;
}

// ---- 极简 PNG 编码（RGBA, 8bit）----
const CRC_TABLE = (()=>{ const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xedb88320 ^ (c>>>1) : c>>>1; t[n]=c>>>0; } return t; })();
function crc32(buf){ let c=0xffffffff; for(let i=0;i<buf.length;i++) c = CRC_TABLE[(c^buf[i])&0xff] ^ (c>>>8); return (c^0xffffffff)>>>0; }
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const t = Buffer.from(type,'ascii');
  const body = Buffer.concat([t,data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body),0);
  return Buffer.concat([len,body,crc]);
}
function encodePNG(grid, tint){
  const W = SIZE*SCALE, H = SIZE*SCALE;
  const [tr,tg,tb] = rgb(tint);
  const raw = Buffer.alloc((W*4+1)*H);
  let p=0;
  for(let y=0;y<H;y++){
    raw[p++]=0; // filter none
    const gr = (y/SCALE)|0;
    for(let x=0;x<W;x++){
      const gc=(x/SCALE)|0;
      const col = grid[gr][gc];
      let r=tr,gg=tg,b=tb;
      if(col){ [r,gg,b]=rgb(col); }
      raw[p++]=r; raw[p++]=gg; raw[p++]=b; raw[p++]=255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'assets', 'avatars');
fs.mkdirSync(outDir, {recursive:true});
ZODIAC.forEach(z=>{
  const grid = buildGrid(z);
  const png = encodePNG(grid, mix(z.C.main, 0.78));
  fs.writeFileSync(path.join(outDir, z.key+'.png'), png);
  console.log('  ✓', z.key+'.png');
});
console.log('完成，共', ZODIAC.length, '个 →', outDir);
