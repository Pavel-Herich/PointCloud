// Skúšobná jaskyňa s ťažkými profilmi. Farba: R = pravda (255 strop, 0 podlaha, 128 nehodnotí sa), G = skupina*16.
// node skusobna_jaskyna.mjs out.ply [hustota/m2=1500] [šum m=0.01] [počet dier=0] [polomer diery=0.5] [trajektoria.txt] [n | f]
import fs from "fs";
const OUT=process.argv[2], DENS=+(process.argv[3]||1500), NOISE=+(process.argv[4]||0.01), NH=+(process.argv[5]||0), HR=+(process.argv[6]||0.5), TRAJ=process.argv[7]||"", NRM=process.argv[8]||"";   // NRM: n = normály do vzduchu, f = pre x>50 otočené
let sd=987654321; const R=()=>{ sd^=sd<<13; sd^=sd>>>17; sd^=sd<<5; return (sd>>>0)/4294967296; };
const TOL=0.05, C=255, F=0, X_=128;
const split=(z,zm)=>Math.abs(z-zm)<TOL?X_:(z>zm?C:F);
// naklonená elipsa (sekcia 5)
const TH=35*Math.PI/180, EA=3.5, EB=1.0, tS=Math.atan2(-EB*Math.sin(TH),EA*Math.cos(TH));
const eU=(t)=>EA*Math.cos(t)*Math.cos(TH)-EB*Math.sin(t)*Math.sin(TH), eV=(t)=>EA*Math.cos(t)*Math.sin(TH)+EB*Math.sin(t)*Math.cos(TH);
const SLOPE5=eV(tS)/eU(tS);
const inTilt=(y,z)=>{ const p=y*Math.cos(TH)+z*Math.sin(TH), q=-y*Math.sin(TH)+z*Math.cos(TH); return (p/EA)**2+(q/EB)**2<1; };
const YL=Math.sqrt(4-0.85*0.85), K4=0.85/(YL+2);            // sekcia 4: blana od ľavej steny po hornú hranu škáry
const CH=[95,0,0,13,9,5];                                      // sieň: stred a polosi
const inCh=(x,y,z)=>((x-CH[0])/CH[3])**2+((y-CH[1])/CH[4])**2+((z-CH[2])/CH[5])**2<1;
const chZ=(x,y)=>CH[5]*Math.sqrt(Math.max(0,1-((x-CH[0])/CH[3])**2-((y-CH[1])/CH[4])**2));
// ---- telesá vzduchu: ins(x,y,z), area, sample() -> [x,y,z,pravda,skupina]
const A=[];
const cylX=(x0,x1,r,g,tr)=>A.push({x0,x1,ins:(x,y,z)=>x>x0&&x<x1&&y*y+z*z<r*r,area:2*Math.PI*r*(x1-x0),
  smp:()=>{ const a=R()*2*Math.PI, y=r*Math.cos(a), z=r*Math.sin(a); return [x0+R()*(x1-x0),y,z,tr(y,z),g]; }});
const ellX=(x0,x1,a,b,zc,g,tr)=>A.push({x0,x1,ins:(x,y,z)=>x>x0&&x<x1&&(y/a)**2+((z-zc)/b)**2<1,area:2*Math.PI*Math.sqrt((a*a+b*b)/2)*(x1-x0),
  smp:()=>{ let t; do{ t=R()*2*Math.PI; }while(R()>Math.hypot(a*Math.sin(t),b*Math.cos(t))/Math.max(a,b)); const y=a*Math.cos(t), z=zc+b*Math.sin(t); return [x0+R()*(x1-x0),y,z,tr(y,z),g]; }});
const boxX=(x0,x1,y0,y1,z0,z1,g,tr)=>A.push({x0,x1,ins:(x,y,z)=>x>x0&&x<x1&&y>y0&&y<y1&&z>z0&&z<z1,area:2*((y1-y0)+(z1-z0))*(x1-x0),
  smp:()=>{ const w=y1-y0, h=z1-z0; let u=R()*2*(w+h), y, z, f; if(u<w){ y=y0+u; z=z0; f=0; } else if(u<2*w){ y=y0+u-w; z=z1; f=1; } else if(u<2*w+h){ y=y0; z=z0+u-2*w; f=2; } else { y=y1; z=z0+u-2*w-h; f=3; }
    return [x0+R()*(x1-x0),y,z,tr(y,z,f),g]; }});
// 1 rúra
cylX(0,12,2,1,(y,z)=>split(z,0));
// 2 kľúčová dierka: elipsa 3 × 1,5 so stredom z=0,5 a ryha šírky 1,2 m po z=-3,5
ellX(12,26,3,1.5,0.5,2,(y,z)=>split(z,0.5)); boxX(12,26,-0.6,0.6,-3.5,0.5,2,()=>F);
// 3 kľúčová dierka s podtečením (vrecko 0,7 m vysoké, 1,6 m hlboké pod policou)
ellX(26,40,3,1.5,0.5,3,(y,z)=>split(z,0.5)); boxX(26,40,-0.6,0.6,-3.5,0.5,3,()=>F); boxX(26,40,0.5,2.2,-3.5,-2.8,4,()=>F);
// 4 rúra s nízkou škárou (0,3 m) vpravo po y=5
cylX(40,54,2,5,(y,z)=>split(z,-K4*(Math.min(y,YL)+2))); boxX(40,54,1.5,5,-1.15,-0.85,6,(y,z,f)=>f===1?C:f===0?F:X_);
// 5 šikmá chodba: elipsa 3,5 × 1 naklonená o 35°
A.push({x0:54,x1:68,ins:(x,y,z)=>x>54&&x<68&&inTilt(y,z),area:2*Math.PI*Math.sqrt((EA*EA+EB*EB)/2)*14,
  smp:()=>{ let t; do{ t=R()*2*Math.PI; }while(R()>Math.hypot(EA*Math.sin(t),EB*Math.cos(t))/EA); const y=eU(t), z=eV(t); return [54+R()*14,y,z,split(z,SLOPE5*y),7]; }});
// 6 rúra so šachtou do spodnej chodby (tá ide pozdĺž y vo výške z=-10)
cylX(68,83,2,8,(y,z)=>split(z,0));
A.push({ins:(x,y,z)=>(x-75)**2+y*y<1.69&&z>-10&&z<0,area:2*Math.PI*1.3*10,smp:()=>{ const a=R()*2*Math.PI; return [75+1.3*Math.cos(a),1.3*Math.sin(a),-10+R()*10,X_,9]; }});
A.push({ins:(x,y,z)=>y>-12&&y<12&&(x-75)**2+(z+10)**2<2.25,area:2*Math.PI*1.5*24,smp:()=>{ const a=R()*2*Math.PI, z=-10+1.5*Math.sin(a); return [75+1.5*Math.cos(a),-12+R()*24,z,split(z,-10),10]; }});
// 7 sieň
A.push({ins:inCh,area:1000,smp:()=>{ const u=R()*2-1, a=R()*2*Math.PI, q=Math.sqrt(1-u*u), z=CH[2]+CH[5]*u; return [CH[0]+CH[3]*q*Math.cos(a),CH[1]+CH[4]*q*Math.sin(a),z,split(z,0),11]; }});
// 8 plazivka (priemer 0,6 m) z rúry 1 do boku; len vo variante s trajektóriou, jej ústie zakryje diera v skenovaní
if(TRAJ) A.push({ins:(x,y,z)=>y>-8&&y<-1.5&&(x-6)**2+(z+1.2)**2<0.09,area:2*Math.PI*0.3*6.5,smp:()=>{ const a=R()*2*Math.PI, z=-1.2+0.3*Math.sin(a); return [6+0.3*Math.cos(a),-8+R()*6.5,z,split(z,-1.2),15+1]; }});
// 17 strmá puklina: stúpa 30° pozdĺž x, priečny rez je rovnobežník naklonený 65°; v 2/3 dĺžky má tupé okraje (zvislá stienka 1 m) – tam kotvy nevzniknú
const FX0=115, FX1=155, FS_=Math.tan(30*Math.PI/180), FT=Math.tan(65*Math.PI/180), FSN=Math.sin(65*Math.PI/180), FH=6, FW=1.5;
const fz0=(x)=>-1+FS_*(x-FX0), fv=(x)=>Math.floor((x-FX0)/4)%3===0?0:1;
const inFis=(x,y,z)=>{ if(!(x>FX0&&x<FX1)) return false; const u=z-fz0(x), v=fv(x); return u>0&&u<FH&&y>Math.max(0,(u-v)/FT)&&y<Math.min(FW+u/FT,FW+(FH-v)/FT); };
A.push({ins:inFis,area:(FX1-FX0)/Math.cos(30*Math.PI/180)*(2*FW+2*FH/FSN),smp:()=>{ const x=FX0+R()*(FX1-FX0), v=fv(x), sl=(FH-v)/FSN, a=(FH-v)/FT; let w=R()*(2*FW+2*v+2*sl), y, u, t;
  if(w<FW){ y=w; u=0; t=(v===0&&y<TOL)?X_:F; }                                             // dno
  else if((w-=FW)<v){ y=0; u=w; t=X_; }                                                    // ľavá zvislá stienka
  else if((w-=v)<sl){ u=v+w*FSN; y=(u-v)/FT; t=(v===0&&u<TOL)?X_:C; }                      // nadložná stena
  else if((w-=sl)<FW){ y=a+w; u=FH; t=(v===0&&w>FW-TOL)?X_:C; }                            // strop
  else if((w-=FW)<v){ y=FW+a; u=FH-w; t=X_; }                                              // pravá zvislá stienka
  else { w-=v; u=w*FSN; y=FW+u/FT; t=(v===0&&u>FH-TOL)?X_:F; }                             // podložná stena
  return [x,y,fz0(x)+u,t,17]; }});
cylX(105,115.5,0.7,18,()=>X_);                                                              // spojka zo siene (nehodnotí sa)
// ---- prekážky (hornina vo vzduchu): ins, area, smp
const B=[];
const cone=(cx,cy,zb,zt,rb,g,tr)=>B.push({ins:(x,y,z)=>{ const t=(z-zb)/(zt-zb); return t>0&&t<1&&Math.hypot(x-cx,y-cy)<rb*(1-t); },area:Math.PI*rb*Math.hypot(rb,zt-zb),
  smp:()=>{ const t=1-Math.sqrt(R()), a=R()*2*Math.PI, r=rb*(1-t); return [cx+r*Math.cos(a),cy+r*Math.sin(a),zb+t*(zt-zb),tr,g]; }});
cone(90,-3,chZ(90,-3)+0.05,chZ(90,-3)-6.5,0.45,12,C);      // dlhý kvapeľ zo stropu až pod blanu
cone(93,4,chZ(93,4)+0.05,chZ(93,4)-2.0,0.35,12,C);
cone(99,-4,-chZ(99,-4)-0.05,-chZ(99,-4)+6.0,0.5,13,F);     // stalagmit nad blanu
cone(102,2,-chZ(102,2)-0.05,-chZ(102,2)+1.5,0.4,13,F);
B.push({ins:(x,y,z)=>(x-88)**2+(y-3)**2+(z+chZ(88,3)-1.3)**2<1.44,area:4*Math.PI*1.44,                   // balvan s medzerou pod sebou
  smp:()=>{ const u=R()*2-1, a=R()*2*Math.PI, q=Math.sqrt(1-u*u); return [88+1.2*q*Math.cos(a),3+1.2*q*Math.sin(a),-chZ(88,3)+1.3+1.2*u,F,14]; }});
B.push({ins:(x,y,z)=>(x-97)**2+(y-1)**2<0.49,area:2*Math.PI*0.7*10,smp:()=>{ const a=R()*2*Math.PI, z=-5+R()*10; return [97+0.7*Math.cos(a),1+0.7*Math.sin(a),z,split(z,0),15]; }});  // stĺp
const inAir=(x,y,z,skip)=>A.some((s)=>s!==skip&&s.ins(x,y,z)), inRock=(x,y,z,skip)=>B.some((s)=>s!==skip&&s.ins(x,y,z));
const P=[];
for(const s of A){ const n=Math.round(s.area*DENS); for(let i=0;i<n;i++){ const p=s.smp(); if(inAir(p[0],p[1],p[2],s)||inRock(p[0],p[1],p[2])) continue; P.push(p); } }
for(const s of B){ const n=Math.round(s.area*DENS); for(let i=0;i<n;i++){ const p=s.smp(); if(!inAir(p[0],p[1],p[2])||inRock(p[0],p[1],p[2],s)) continue; P.push(p); } }
// čelá na stykoch sekcií (zvislé steny, nehodnotia sa)
for(const xj of [12,26,40,54,68]){ const n=Math.round(14*10*DENS); for(let i=0;i<n;i++){ const y=-7+R()*14, z=-5+R()*10; if(inAir(xj-0.01,y,z)!==inAir(xj+0.01,y,z)) P.push([xj,y,z,X_,0]); } }
for(let xj=FX0;xj<=FX1;xj+=4){ const n=Math.round(7*8*DENS); for(let i=0;i<n;i++){ const y=-1+R()*7, z=fz0(xj)-1+R()*8; if(inAir(xj-0.01,y,z)!==inAir(xj+0.01,y,z)) P.push([xj,y,z,X_,0]); } }
// diery v skenovaní
const holes=Array.from({length:NH},()=>P[Math.floor(R()*P.length)].slice(0,3).concat(HR)); if(TRAJ) holes.push([6,-1.75,-1.2,0.6]);
const Q=holes.length?P.filter((p)=>!holes.some((h)=>(p[0]-h[0])**2+(p[1]-h[1])**2+(p[2]-h[2])**2<h[3]*h[3])):P;
const DIR=[]; for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++) for(let k=-1;k<=1;k++){ if(!i&&!j&&!k) continue; const l=Math.hypot(i,j,k); DIR.push([i/l,j/l,k/l]); }
const isAir=(x,y,z)=>inAir(x,y,z)&&!inRock(x,y,z);
const nrm=(p)=>{ let nx=0, ny=0, nz=0; for(const d of DIR) if(isAir(p[0]+0.04*d[0],p[1]+0.04*d[1],p[2]+0.04*d[2])){ nx+=d[0]; ny+=d[1]; nz+=d[2]; } const l=Math.hypot(nx,ny,nz)||1; return [nx/l,ny/l,nz/l]; };
const n=Q.length, st=NRM?27:15, head=["ply","format binary_little_endian 1.0",`element vertex ${n}`,"property float x","property float y","property float z"].concat(NRM?["property float nx","property float ny","property float nz"]:[],["property uchar red","property uchar green","property uchar blue","end_header",""]).join("\n");
const b=Buffer.alloc(n*st); Q.forEach((p,i)=>{ let o=i*st; if(NRM){ const v=nrm(p), s=(NRM==="f"&&p[0]>50)?-1:1; for(let k=0;k<3;k++) b.writeFloatLE(s*v[k],o+12+k*4); }
  for(let k=0;k<3;k++) b.writeFloatLE(p[k]+NOISE*(R()-0.5)*2,o+k*4); o+=st-3; b[o]=p[3]; b[o+1]=Math.min(15,p[4])*16; b[o+2]=Math.max(0,p[4]-15)*64; });
fs.writeFileSync(OUT,Buffer.concat([Buffer.from(head),b]));
const cnt={}; for(const p of Q) cnt[p[4]]=(cnt[p[4]]||0)+1; console.log("bodov",n,JSON.stringify(cnt),"sklon5",SLOPE5.toFixed(3));

if(TRAJ){ const W=[[1,0,-0.9],[6,0,-0.9],[6,-1.5,-1.2],[6,-7.6,-1.2],[6,-1.5,-1.2],[6,0,-0.9],[11,0,-0.9],[13,0,-2.3],[39,0,-2.3],[41,0,-0.9],[53,0,-0.9],[55,0,-0.3],[67,0,-0.3],[69,0,-0.9],[82,0,-0.9],[86,0,-2.4],[95,-2,-3.8],[104,0,0],[115.5,0.4,0]].concat(Array.from({length:20},(_,i)=>{ const x=116+i*2; return [x,2.1,fz0(x)+3]; }));
  const L=["%time x y z q0 q1 q2 q3 userfields"]; let t=1456612185.68;
  for(let k=0;k+1<W.length;k++){ const a=W[k], c=W[k+1], d=Math.hypot(c[0]-a[0],c[1]-a[1],c[2]-a[2]), m=Math.ceil(d/0.01);
    for(let i=0;i<m;i++){ const f=i/m; L.push(`${(t+=0.01).toFixed(5)} ${a[0]+(c[0]-a[0])*f+0.02*(R()-0.5)} ${a[1]+(c[1]-a[1])*f+0.02*(R()-0.5)} ${a[2]+(c[2]-a[2])*f+0.02*(R()-0.5)} 1 0 0 0 `); } }
  fs.writeFileSync(TRAJ,L.join("\n")+"\n"); console.log("trajektória",L.length-1,"polôh"); }
