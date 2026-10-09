import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */
const SUITS=["♠","♥","♦","♣"], RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const SUIT_CLR={"♠":"#1a1a2e","♣":"#1a1a2e","♥":"#c0392b","♦":"#c0392b"};
const CHIPS=[1,5,10,25,50,100];
const CC={
  1:{bg:"#f0ece0",ring:"#d8d0bc",edge:"#b8a88c",text:"#5a4a2e",acc:"#d4af37"},
  5:{bg:"#cc3333",ring:"#b02828",edge:"#8a1e1e",text:"#fff",acc:"#ff6666"},
  10:{bg:"#2e86c1",ring:"#2471a3",edge:"#1a5276",text:"#fff",acc:"#5dade2"},
  25:{bg:"#28a745",ring:"#1e8449",edge:"#145a32",text:"#fff",acc:"#58d68d"},
  50:{bg:"#e67e22",ring:"#ca6f1e",edge:"#935116",text:"#fff",acc:"#f0b27a"},
  100:{bg:"#2c1650",ring:"#1e0e3a",edge:"#120828",text:"#f1c40f",acc:"#9b59b6"},
};
const MIN_BET=5,MAX_BET=500,START_BAL=750,RESHUFFLE=26;
const AI_NAMES=["Lucky Lou","Risky Rita","Cool Carl","Wild Wanda","Steady Steve","Bold Betty"];
const AI_SKILL=["beginner","basic_strategy","aggressive"];
const TIPS={Hit:"Draw one more card to try to get closer to 21.",Stand:"Keep your current cards and end your turn.",Double:"Double your bet and receive exactly one more card.",Split:"Split your pair into two hands, each with its own bet.",Surrender:"Give up this hand and get half your bet back."};

/* ═══════════════════════════════════════════════
   SOUND ENGINE
   ═══════════════════════════════════════════════ */
class SFX{
  constructor(){this.c=null;this.on=true;}
  init(){if(!this.c)this.c=new(window.AudioContext||window.webkitAudioContext)();if(this.c.state==="suspended")this.c.resume();}
  _n(d,v=.08){if(!this.c||!this.on)return null;const r=this.c.sampleRate,b=this.c.createBuffer(1,r*d,r),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*v;return b;}
  chip(){if(!this.c||!this.on)return;const t=this.c.currentTime;const o=this.c.createOscillator(),g=this.c.createGain(),f=this.c.createBiquadFilter();f.type="bandpass";f.frequency.value=4e3;f.Q.value=12;o.type="square";o.frequency.setValueAtTime(3200,t);o.frequency.exponentialRampToValueAtTime(1800,t+.06);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(f);f.connect(g);g.connect(this.c.destination);o.start(t);o.stop(t+.1);const o2=this.c.createOscillator(),g2=this.c.createGain();o2.type="sine";o2.frequency.setValueAtTime(6400,t);o2.frequency.exponentialRampToValueAtTime(3e3,t+.05);g2.gain.setValueAtTime(.06,t);g2.gain.exponentialRampToValueAtTime(.001,t+.08);o2.connect(g2);g2.connect(this.c.destination);o2.start(t);o2.stop(t+.08);}
  card(){if(!this.c||!this.on)return;const t=this.c.currentTime;const b=this._n(.07,.18);if(!b)return;const s=this.c.createBufferSource();s.buffer=b;const f=this.c.createBiquadFilter();f.type="highpass";f.frequency.value=1800;const g=this.c.createGain();g.gain.setValueAtTime(.22,t);g.gain.exponentialRampToValueAtTime(.001,t+.07);s.connect(f);f.connect(g);g.connect(this.c.destination);s.start(t);s.stop(t+.07);}
  flip(){if(!this.c||!this.on)return;const t=this.c.currentTime;const b=this._n(.1,.14);if(!b)return;const s=this.c.createBufferSource();s.buffer=b;const f=this.c.createBiquadFilter();f.type="bandpass";f.frequency.value=2800;f.Q.value=2;const g=this.c.createGain();g.gain.setValueAtTime(.18,t);g.gain.linearRampToValueAtTime(.06,t+.04);g.gain.exponentialRampToValueAtTime(.001,t+.1);s.connect(f);f.connect(g);g.connect(this.c.destination);s.start(t);}
  shuffle(){if(!this.c||!this.on)return;const t=this.c.currentTime;for(let i=0;i<12;i++){const off=i*.035,b=this._n(.05,.1);if(!b)continue;const s=this.c.createBufferSource();s.buffer=b;const f=this.c.createBiquadFilter();f.type="bandpass";f.frequency.value=2200+Math.random()*2500;f.Q.value=1.5;const g=this.c.createGain();g.gain.setValueAtTime(.09,t+off);g.gain.exponentialRampToValueAtTime(.001,t+off+.05);s.connect(f);f.connect(g);g.connect(this.c.destination);s.start(t+off);s.stop(t+off+.06);}}
  win(){if(!this.c||!this.on)return;const t=this.c.currentTime;[523,659,784,1047,1319].forEach((fr,i)=>{const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.value=fr;g.gain.setValueAtTime(0,t+i*.13);g.gain.linearRampToValueAtTime(.12,t+i*.13+.03);g.gain.exponentialRampToValueAtTime(.001,t+i*.13+.35);o.connect(g);g.connect(this.c.destination);o.start(t+i*.13);o.stop(t+i*.13+.4);});}
  lose(){if(!this.c||!this.on)return;const t=this.c.currentTime;[400,350,300,250].forEach((fr,i)=>{const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.value=fr;g.gain.setValueAtTime(0,t+i*.22);g.gain.linearRampToValueAtTime(.07,t+i*.22+.04);g.gain.exponentialRampToValueAtTime(.001,t+i*.22+.4);o.connect(g);g.connect(this.c.destination);o.start(t+i*.22);o.stop(t+i*.22+.45);});}
  push(){if(!this.c||!this.on)return;const t=this.c.currentTime;const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.value=440;g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(this.c.destination);o.start(t);o.stop(t+.35);}
  btn(){if(!this.c||!this.on)return;const t=this.c.currentTime;const o=this.c.createOscillator(),g=this.c.createGain();o.type="sine";o.frequency.value=800;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.04);o.connect(g);g.connect(this.c.destination);o.start(t);o.stop(t+.05);}
  select(){if(!this.c||!this.on)return;const t=this.c.currentTime;const o=this.c.createOscillator(),g=this.c.createGain();o.type="triangle";o.frequency.setValueAtTime(600,t);o.frequency.exponentialRampToValueAtTime(900,t+.06);g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.1);o.connect(g);g.connect(this.c.destination);o.start(t);o.stop(t+.1);}
}
const S=new SFX();

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function mkShoe(n){const s=[];for(let d=0;d<n;d++)for(const su of SUITS)for(const r of RANKS)s.push({rank:r,suit:su});for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];}return s;}
function cv(c){if("JQK".includes(c.rank))return 10;return c.rank==="A"?11:+c.rank;}
function hv(cards){let v=0,a=0;for(const c of cards){v+=cv(c);if(c.rank==="A")a++;}while(v>21&&a>0){v-=10;a--;}return v;}
function isSoft(cards){let v=0,a=0;for(const c of cards){v+=cv(c);if(c.rank==="A")a++;}while(v>21&&a>0){v-=10;a--;}return a>0&&v<=21;}
function isBJ(c){return c.length===2&&hv(c)===21;}
function canSp(h){return h.cards.length===2&&cv(h.cards[0])===cv(h.cards[1])&&!h.isSplit;}

function getAdvice(hand,up){
  const v=hv(hand.cards),s=isSoft(hand.cards),d=cv(up),d2=hand.cards.length===2,sp=canSp(hand),sr=d2&&!hand.isSplit;
  if(sp){const p=cv(hand.cards[0]);if(p===11)return{a:"Split",r:"Always split Aces"};if(p===8)return{a:"Split",r:"Always split 8s — 16 is the worst hand"};if(p===10)return{a:"Stand",r:"Never split 10s — 20 is very strong"};if(p===5)return d<=9&&d2?{a:"Double",r:`10 vs ${d} — double for max value`}:{a:"Hit",r:"10 total — hit to improve"};if(p===4)return(d===5||d===6)?{a:"Split",r:`Split 4s vs weak ${d}`}:{a:"Hit",r:`8 vs ${d} — just hit`};if(p===9)return(d===7||d>=10)?{a:"Stand",r:`18 is strong vs ${d}`}:{a:"Split",r:`Split 9s vs ${d}`};if(p===7)return d<=7?{a:"Split",r:`Split 7s vs ${d}`}:{a:"Hit",r:`14 vs strong ${d}`};if(p===6)return d<=6?{a:"Split",r:`Split 6s vs weak ${d}`}:{a:"Hit",r:`12 vs ${d} — hit`};if(p<=3)return d<=7?{a:"Split",r:`Split ${p}s vs ${d}`}:{a:"Hit",r:`${v} vs strong ${d}`};}
  if(s){if(v>=20)return{a:"Stand",r:`Soft ${v} — very strong`};if(v===19)return d===6&&d2?{a:"Double",r:"Soft 19 vs 6 — double"}:{a:"Stand",r:"Soft 19 — strong"};if(v===18){if(d>=9)return{a:"Hit",r:`Soft 18 vs strong ${d}`};if(d>=3&&d<=6&&d2)return{a:"Double",r:`Soft 18 vs weak ${d} — double`};return{a:"Stand",r:"Soft 18 — solid"};}if(v===17){if(d>=3&&d<=6&&d2)return{a:"Double",r:`Soft 17 vs weak ${d}`};return{a:"Hit",r:"Soft 17 — hit to improve"};}if(v>=15){if(d>=4&&d<=6&&d2)return{a:"Double",r:`Soft ${v} vs weak ${d}`};return{a:"Hit",r:`Soft ${v} — hit`};}if(v>=13){if((d===5||d===6)&&d2)return{a:"Double",r:`Soft ${v} vs weak ${d}`};return{a:"Hit",r:`Soft ${v} — safe to hit`};}return{a:"Hit",r:`Soft ${v} — hit`};}
  if(v>=17)return{a:"Stand",r:`Hard ${v} — bust risk too high`};if(v===16){if(sr&&d>=9)return{a:"Surrender",r:`16 vs ${d} — surrender saves half`};if(d<=6)return{a:"Stand",r:`16 vs weak ${d} — let dealer bust`};return{a:"Hit",r:`16 vs strong ${d} — risky but hit`};}if(v===15){if(sr&&d===10)return{a:"Surrender",r:"15 vs 10 — best to surrender"};if(d<=6)return{a:"Stand",r:`15 vs weak ${d}`};return{a:"Hit",r:`15 vs ${d} — must hit`};}if(v>=13){if(d<=6)return{a:"Stand",r:`${v} vs weak ${d} — let dealer bust`};return{a:"Hit",r:`${v} vs strong ${d} — hit`};}if(v===12){if(d>=4&&d<=6)return{a:"Stand",r:`12 vs weak ${d} — dealer likely busts`};return{a:"Hit",r:`12 vs ${d} — low bust risk`};}if(v===11)return d2?{a:"Double",r:"11 — best double down hand!"}:{a:"Hit",r:"11 — great to hit"};if(v===10){if(d2&&d<=9)return{a:"Double",r:`10 vs ${d} — strong double`};return{a:"Hit",r:"10 — hit"};}if(v===9){if(d2&&d>=3&&d<=6)return{a:"Double",r:`9 vs weak ${d} — double`};return{a:"Hit",r:`9 — hit`};}return{a:"Hit",r:`${v} — low total, always hit`};
}

function aiDec(h,up,sk){const v=hv(h.cards),s=isSoft(h.cards),d=cv(up);if(sk==="beginner"){if(v<15)return"hit";if(v>=17)return"stand";return Math.random()>.5?"hit":"stand";}if(sk==="aggressive"){if(h.cards.length===2&&v>=9&&v<=12)return"double";if(v<16)return"hit";if(v===16&&d>=7)return"hit";if(v===17&&s)return"hit";return"stand";}if(s){if(v<=17)return h.cards.length===2&&v>=15&&d>=4&&d<=6?"double":"hit";if(v===18){if(d>=9)return"hit";if(d>=3&&d<=6&&h.cards.length===2)return"double";return"stand";}return"stand";}if(v<=8)return"hit";if(v===9)return h.cards.length===2&&d>=3&&d<=6?"double":"hit";if(v===10)return h.cards.length===2&&d<=9?"double":"hit";if(v===11)return h.cards.length===2?"double":"hit";if(v===12)return d>=4&&d<=6?"stand":"hit";if(v>=13&&v<=16)return d<=6?"stand":"hit";return"stand";}
function aiBet(sk,b){const m=Math.min(b,MAX_BET);if(m<MIN_BET)return 0;if(sk==="beginner")return Math.max(MIN_BET,Math.min(Math.floor(Math.random()*3)*5+5,m));if(sk==="aggressive")return Math.max(MIN_BET,Math.min(Math.floor(Math.random()*6)*10+10,m));return Math.max(MIN_BET,Math.min(Math.floor(Math.random()*4)*5+10,m));}

/* ═══════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════ */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
@keyframes cardIn{0%{transform:translateX(80px) translateY(-60px) rotate(18deg) scale(.3);opacity:0;filter:blur(3px);}40%{opacity:1;filter:blur(0);}70%{transform:translateX(-2px) translateY(1px) rotate(-1deg) scale(1.02);}100%{transform:none;opacity:1;}}
@keyframes chipDrop{0%{transform:translateY(-50px) scale(.3) rotate(-15deg);opacity:0;}40%{opacity:1;}65%{transform:translateY(4px) scale(1.05) rotate(2deg);}82%{transform:translateY(-1px) scale(.98);}100%{transform:none;opacity:1;}}
@keyframes winGlow{0%,100%{filter:drop-shadow(0 0 6px rgba(39,174,96,.3));}50%{filter:drop-shadow(0 0 18px rgba(39,174,96,.7));}}
@keyframes resultPop{0%{transform:scale(0) rotate(-8deg);opacity:0;}60%{transform:scale(1.15) rotate(2deg);opacity:1;}100%{transform:scale(1) rotate(0);opacity:1;}}
@keyframes tipIn{0%{opacity:0;transform:translateX(-50%) translateY(10px);}100%{opacity:1;transform:translateX(-50%) translateY(0);}}
@keyframes fadeUp{0%{opacity:0;transform:translateY(10px);}100%{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:.4;}50%{opacity:1;}}
@keyframes shimmer{0%{background-position:-200% center;}100%{background-position:200% center;}}
@keyframes seatGlow{0%,100%{box-shadow:0 0 12px rgba(241,196,15,.2),inset 0 0 12px rgba(241,196,15,.05);}50%{box-shadow:0 0 24px rgba(241,196,15,.5),inset 0 0 20px rgba(241,196,15,.1);}}
@keyframes shuffleOverlayIn{0%{opacity:0;}100%{opacity:1;}}
@keyframes shuffleCard1{0%{transform:translate(-200px,100px) rotate(-30deg) scale(.7);opacity:0;}10%{opacity:1;}30%{transform:translate(40px,-20px) rotate(15deg) scale(1);}50%{transform:translate(-30px,30px) rotate(-10deg) scale(.95);}70%{transform:translate(20px,-10px) rotate(5deg) scale(1);}90%{transform:translate(0,0) rotate(0) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleCard2{0%{transform:translate(200px,80px) rotate(25deg) scale(.7);opacity:0;}10%{opacity:1;}30%{transform:translate(-50px,-30px) rotate(-20deg) scale(1);}50%{transform:translate(30px,20px) rotate(10deg) scale(.95);}70%{transform:translate(-20px,-5px) rotate(-5deg) scale(1);}90%{transform:translate(0,0) rotate(0) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleCard3{0%{transform:translate(0,200px) rotate(40deg) scale(.6);opacity:0;}15%{opacity:1;}35%{transform:translate(60px,-40px) rotate(-25deg) scale(1.05);}55%{transform:translate(-40px,10px) rotate(12deg) scale(.9);}75%{transform:translate(15px,-5px) rotate(-3deg) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleCard4{0%{transform:translate(-150px,-150px) rotate(-45deg) scale(.6);opacity:0;}12%{opacity:1;}40%{transform:translate(50px,30px) rotate(20deg) scale(1.05);}60%{transform:translate(-20px,-15px) rotate(-8deg) scale(.95);}80%{transform:translate(5px,5px) rotate(2deg) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleCard5{0%{transform:translate(180px,-120px) rotate(35deg) scale(.5);opacity:0;}15%{opacity:1;}35%{transform:translate(-70px,50px) rotate(-30deg) scale(1.1);}55%{transform:translate(25px,-20px) rotate(15deg) scale(.9);}75%{transform:translate(-10px,8px) rotate(-4deg) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleCard6{0%{transform:translate(0,-200px) rotate(-50deg) scale(.5);opacity:0;}18%{opacity:1;}38%{transform:translate(-45px,60px) rotate(22deg) scale(1);}58%{transform:translate(35px,-25px) rotate(-12deg) scale(.95);}78%{transform:translate(-8px,5px) rotate(3deg) scale(1);}100%{transform:translate(0,0) rotate(0) scale(1);opacity:1;}}
@keyframes shuffleFan{0%{transform:rotate(0deg);}50%{transform:rotate(8deg);}100%{transform:rotate(0deg);}}
@keyframes shuffleRiffle{0%,100%{transform:translateY(0) scaleY(1);}25%{transform:translateY(-8px) scaleY(1.04);}50%{transform:translateY(2px) scaleY(.98);}75%{transform:translateY(-3px) scaleY(1.01);}}
@keyframes shuffleTextPulse{0%,100%{opacity:.6;letter-spacing:8px;}50%{opacity:1;letter-spacing:14px;}}
@keyframes shuffleProgressFill{0%{width:0%;}100%{width:100%;}}
`;

/* ═══════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════ */
function Card({card,faceDown=false,small=false,style={},animated=false,delay=0}){
  const w=small?80:120,h=small?112:170;
  const anim=animated?{animation:`cardIn .5s cubic-bezier(.34,1.56,.64,1) ${delay}s both`}:{};
  if(faceDown) return (
    <div style={{width:w,height:h,borderRadius:10,border:"3px solid #555",flexShrink:0,position:"relative",overflow:"hidden",
      background:"linear-gradient(135deg,#8b0000,#a20000,#8b0000)",boxShadow:"3px 4px 14px rgba(0,0,0,.6)",...anim,...style}}>
      <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(255,255,255,.05) 6px,rgba(255,255,255,.05) 7px)"}}/>
      <div style={{position:"absolute",inset:6,border:"1.5px solid rgba(255,200,100,.2)",borderRadius:5}}/>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:small?22:36,opacity:.25,color:"#ffd700"}}>♠</div>
    </div>);
  const clr=SUIT_CLR[card.suit];
  const rf=small?18:28,sf=small?15:20,cf=small?34:54;
  return (
    <div style={{width:w,height:h,borderRadius:10,border:"3px solid #b0b0a0",flexShrink:0,position:"relative",overflow:"hidden",
      background:"linear-gradient(155deg,#fff,#f8f7f0 40%,#edebd8)",boxShadow:"3px 4px 14px rgba(0,0,0,.4)",...anim,...style}}>
      <div style={{position:"absolute",top:small?4:7,left:small?5:8,display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
        <span style={{fontSize:rf,fontWeight:"bold",fontFamily:"'Georgia',serif",color:clr,lineHeight:1}}>{card.rank}</span>
        <span style={{fontSize:sf,color:clr,lineHeight:1}}>{card.suit}</span>
      </div>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:cf,color:clr,opacity:.12}}>{card.suit}</div>
      {(card.rank==="A"||"JQK".includes(card.rank))&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:small?32:50,fontWeight:900,fontFamily:"'Playfair Display','Georgia',serif",color:clr,opacity:.7}}>{card.rank}</div>}
      <div style={{position:"absolute",bottom:small?4:7,right:small?5:8,display:"flex",flexDirection:"column",alignItems:"center",gap:0,transform:"rotate(180deg)"}}>
        <span style={{fontSize:rf,fontWeight:"bold",fontFamily:"'Georgia',serif",color:clr,lineHeight:1}}>{card.rank}</span>
        <span style={{fontSize:sf,color:clr,lineHeight:1}}>{card.suit}</span>
      </div>
    </div>);
}

function Chip({value,size=72,onClick,disabled=false,interactive=true}){
  const c=CC[value];
  return (
    <button onClick={onClick?()=>onClick(value):undefined} disabled={disabled}
      style={{width:size,height:size,borderRadius:"50%",border:"none",padding:0,background:"transparent",
        cursor:disabled?"not-allowed":interactive?"pointer":"default",opacity:disabled?.3:1,
        transition:"transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s",position:"relative",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
      onMouseOver={e=>{if(!disabled&&interactive){e.currentTarget.style.transform="scale(1.15) translateY(-5px)";e.currentTarget.style.boxShadow="0 10px 24px rgba(0,0,0,.5)";}}}
      onMouseOut={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(circle at 38% 32%,${c.bg},${c.edge})`,boxShadow:"0 3px 12px rgba(0,0,0,.5),inset 0 2px 3px rgba(255,255,255,.2),inset 0 -2px 3px rgba(0,0,0,.3)"}}/>
      <div style={{position:"absolute",width:size*.78,height:size*.78,borderRadius:"50%",border:`3px solid ${c.acc}88`,boxShadow:"inset 0 2px 5px rgba(0,0,0,.2)"}}/>
      {[0,60,120,180,240,300].map(deg=><div key={deg} style={{position:"absolute",width:size*.07,height:size*.07,borderRadius:"50%",background:c.acc+"99",top:`${50-43*Math.cos(deg*Math.PI/180)}%`,left:`${50+43*Math.sin(deg*Math.PI/180)}%`,transform:"translate(-50%,-50%)"}}/>)}
      <div style={{position:"relative",width:size*.52,height:size*.52,borderRadius:"50%",background:`radial-gradient(circle at 45% 40%,${c.acc}33,transparent)`,border:`2px solid ${c.acc}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:value>=100?size*.26:size*.3,fontWeight:"bold",color:c.text,fontFamily:"'Playfair Display','Georgia',serif",textShadow:c.text==="#fff"?"0 1px 3px rgba(0,0,0,.5)":"none"}}>${value}</div>
    </button>);
}

function MiniChip({value,size=38,style={}}){
  const c=CC[value];
  return (<div style={{width:size,height:size,borderRadius:"50%",position:"relative",overflow:"hidden",
    background:`radial-gradient(circle at 38% 32%,${c.bg},${c.edge})`,
    border:`2px solid ${c.edge}`,
    boxShadow:"0 3px 6px rgba(0,0,0,.5),inset 0 1px 2px rgba(255,255,255,.2)",
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:size*.38,fontWeight:"bold",color:c.text,fontFamily:"'Georgia',serif",flexShrink:0,...style}}>
    <div style={{position:"absolute",inset:3,borderRadius:"50%",border:`1px solid ${c.acc}44`,pointerEvents:"none"}}/>
    {value}
  </div>);
}

function BetStack({amount,chips:exactChips,animate=true,style={}}){
  if(amount<=0&&(!exactChips||!exactChips.length))return null;
  let allChips;
  if(exactChips&&exactChips.length>0){
    allChips=exactChips;
  }else{
    allChips=[];let rem=amount;for(let i=CHIPS.length-1;i>=0;i--)while(rem>=CHIPS[i]){allChips.push(CHIPS[i]);rem-=CHIPS[i];}
  }
  const groups=[];const seen={};
  for(const v of allChips){
    if(!seen[v]){seen[v]={val:v,count:0,idx:groups.length};groups.push(seen[v]);}
    seen[v].count++;
  }
  let chipIdx=0;
  return (<div style={{display:"flex",gap:5,alignItems:"flex-end",justifyContent:"center",...style}}>
    {groups.map((g)=>{
      const stack=[];
      for(let i=0;i<Math.min(g.count,8);i++){
        const ci=chipIdx++;
        stack.push(<MiniChip key={ci} value={g.val} size={38} style={{
          position:i>0?"absolute":"relative",
          bottom:i>0?i*5:undefined,left:i>0?0:undefined,
          animation:animate?`chipDrop .35s cubic-bezier(.34,1.56,.64,1) ${ci*.04}s both`:"none",
          zIndex:i,
        }}/>);
      }
      return (<div key={g.val} style={{position:"relative",display:"flex",flexDirection:"column-reverse",alignItems:"center",
        width:38,height:Math.min(g.count,8)*5+38}}>
        {stack}
        {g.count>1&&<div style={{position:"absolute",top:-14,fontSize:14,color:"#f5d76e",fontWeight:"bold",textShadow:"0 1px 4px rgba(0,0,0,.9)",zIndex:20}}>×{g.count}</div>}
      </div>);
    })}
  </div>);
}

/* ═══════════════════════════════════════════════
   BETTING CIRCLE — the key visual element
   ═══════════════════════════════════════════════ */
function BettingCircle({player,hand,handIdx,isActive,isHuman,dealerCards,showHole,phase,betChips}){
  const cards=hand.cards, val=hv(cards), bet=hand.bet, result=hand.result;
  const bj=isBJ(cards)&&!hand.isSplit;
  const won=result==="WIN"||result==="BLACKJACK";
  const circleSize=isHuman?130:100;
  const useBetChips=(betChips&&betChips.length>0&&phase===1)?betChips:null;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:isHuman?160:120}}>
      {/* RESULT BADGE */}
      {result&&(
        <div style={{fontSize:isHuman?22:17,fontWeight:"bold",padding:"5px 18px",borderRadius:12,letterSpacing:2,
          background:won?"linear-gradient(135deg,#27ae60,#2ecc71)":result==="PUSH"?"linear-gradient(135deg,#f39c12,#e67e22)":result==="SURRENDER"?"linear-gradient(135deg,#8e44ad,#9b59b6)":"linear-gradient(135deg,#c0392b,#e74c3c)",
          color:"#fff",animation:"resultPop .5s cubic-bezier(.34,1.56,.64,1) both",
          boxShadow:won?"0 3px 18px rgba(39,174,96,.4)":"0 3px 10px rgba(0,0,0,.3)"}}>
          {result}{result==="BLACKJACK"?" 🎉":""}
        </div>
      )}

      {/* HAND VALUE */}
      {cards.length>0&&(
        <div style={{fontSize:isHuman?26:20,fontWeight:"bold",color:val>21?"#e74c3c":"#fff",
          background:val>21?"rgba(192,57,43,.7)":"rgba(0,0,0,.6)",padding:"4px 16px",borderRadius:12,
          animation:"fadeUp .3s ease both",animationDelay:".2s",letterSpacing:2}}>
          {bj?"BJ! 🃏":val>21?`BUST ${val}`:val}
        </div>
      )}

      {/* CARDS */}
      {cards.length>0&&(
        <div style={{display:"flex",justifyContent:"center",marginBottom:-6,animation:won?"winGlow 1.5s ease-in-out infinite":"none"}}>
          {hand.cards.map((c,i)=>(
            <Card key={`${c.rank}${c.suit}${i}`} card={c} small={!isHuman} animated delay={i*.1}
              style={{marginLeft:i>0?(isHuman?-22:-16):0,zIndex:i,position:"relative"}}/>
          ))}
        </div>
      )}

      {/* BETTING CIRCLE */}
      <div style={{width:circleSize,height:circleSize,borderRadius:"50%",position:"relative",
        border:isActive?`4px solid rgba(241,196,15,.8)`:`3px solid rgba(212,175,55,.3)`,
        background:isActive?"rgba(241,196,15,.08)":"rgba(0,0,0,.2)",
        boxShadow:isActive?"0 0 24px rgba(241,196,15,.3),inset 0 0 16px rgba(241,196,15,.08)":"inset 0 3px 8px rgba(0,0,0,.3)",
        animation:isActive?"seatGlow 1.5s ease-in-out infinite":"none",
        display:"flex",alignItems:"center",justifyContent:"center",
        overflow:"visible",transition:"all .3s"}}>
        <div style={{position:"absolute",inset:7,borderRadius:"50%",border:"1.5px solid rgba(212,175,55,.15)"}}/>
        {bet>0 ? (
          <BetStack amount={bet} chips={useBetChips} animate={true}/>
        ) : (
          <span style={{fontSize:isHuman?16:12,color:"rgba(212,175,55,.3)",textTransform:"uppercase",letterSpacing:2,fontFamily:"'Georgia',serif",textAlign:"center",lineHeight:1.2}}>
            {isHuman?"BET":""}
          </span>
        )}
      </div>

      {handIdx!==undefined&&handIdx>=0&&(
        <div style={{fontSize:15,color:"rgba(212,175,55,.5)",letterSpacing:2}}>Hand {handIdx+1}</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PLAYER SEAT — contains name, balance, circles
   ═══════════════════════════════════════════════ */
function PlayerSeat({player,pi,activePI,activeHI,phase,dealerCards,showHole,betChips}){
  const isHuman=player.isHuman;
  const isMyTurn=phase===3&&pi===activePI; // PH.PLAY=3
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      {/* Hands (usually 1, 2 if split) */}
      <div style={{display:"flex",gap:isHuman?16:10,alignItems:"flex-end"}}>
        {player.hands.map((hand,hi)=>(
          <BettingCircle key={hi} player={player} hand={hand}
            handIdx={player.hands.length>1?hi:undefined}
            isActive={isMyTurn&&hi===activeHI}
            isHuman={isHuman} dealerCards={dealerCards} showHole={showHole} phase={phase}
            betChips={isHuman&&hi===0?betChips:null}/>
        ))}
      </div>
      {/* Name plate below */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,marginTop:4}}>
        <div style={{fontSize:isHuman?18:15,fontWeight:"bold",color:isHuman?"#f5d76e":"#a0a080",letterSpacing:2,textTransform:"uppercase",
          textShadow:"0 2px 6px rgba(0,0,0,.8)",whiteSpace:"nowrap",
          background:"rgba(0,0,0,.35)",padding:"4px 14px",borderRadius:10}}>
          {player.name}
          {!isHuman&&<span style={{fontSize:14,marginLeft:5,opacity:.6}}>({player.skill==="beginner"?"🎲":player.skill==="aggressive"?"🔥":"📊"})</span>}
        </div>
        <div style={{fontSize:16,color:"#8a9a6e",fontWeight:"bold",textShadow:"0 1px 4px rgba(0,0,0,.8)"}}>{player.hands.reduce((s,h)=>s+h.bet,0)>0?`Bet: $${player.hands.reduce((s,h)=>s+h.bet,0)}`:""}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ACTION BUTTON + TOOLTIP
   ═══════════════════════════════════════════════ */
function ActBtn({label,onClick,color,disabled=false}){
  const [hov,setH]=useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{
        position:"relative",overflow:"visible",
        padding:"14px 34px",fontSize:22,fontWeight:"bold",letterSpacing:3,
        background:disabled?"rgba(255,255,255,.04)":`linear-gradient(180deg,${color},${color}cc)`,
        color:disabled?"#555":"#fff",border:"none",borderRadius:16,cursor:disabled?"not-allowed":"pointer",
        fontFamily:"'Georgia',serif",textTransform:"uppercase",opacity:disabled?.3:1,
        transition:"transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s",
        boxShadow:disabled?"none":`0 4px 16px ${color}55`,
        transform:hov&&!disabled?"translateY(-3px) scale(1.05)":"none",minWidth:110,minHeight:58}}>
      {label}
      {hov&&!disabled&&TIPS[label]&&(
        <div style={{position:"absolute",bottom:"calc(100% + 12px)",left:"50%",marginLeft:-130,
          background:"rgba(8,8,18,.96)",border:"1.5px solid rgba(212,175,55,.35)",borderRadius:16,
          padding:"14px 22px",width:260,zIndex:90,pointerEvents:"none",
          boxShadow:"0 12px 40px rgba(0,0,0,.65)",
          textTransform:"none",letterSpacing:0,fontWeight:"normal"}}>
          <div style={{position:"absolute",bottom:-9,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:16,height:16,
            background:"rgba(8,8,18,.96)",borderRight:"1.5px solid rgba(212,175,55,.35)",borderBottom:"1.5px solid rgba(212,175,55,.35)"}}/>
          <div style={{fontSize:18,color:"#d4c8a0",lineHeight:1.5,textAlign:"center"}}>{TIPS[label]}</div>
        </div>
      )}
    </button>);
}

function StratTip({advice,onClose}){
  if(!advice)return null;
  const cm={Hit:"#27ae60",Stand:"#c0392b",Double:"#2980b9",Split:"#8e44ad",Surrender:"#7f8c8d"};const c=cm[advice.a]||"#d4af37";
  return (
    <div style={{position:"absolute",bottom:"calc(100% + 16px)",left:"50%",transform:"translateX(-50%)",
      background:"rgba(10,10,20,.97)",border:`2.5px solid ${c}`,borderRadius:18,padding:"20px 28px",
      minWidth:300,maxWidth:400,zIndex:100,boxShadow:`0 14px 50px rgba(0,0,0,.7),0 0 24px ${c}22`,animation:"fadeUp .2s ease both"}}>
      <div style={{position:"absolute",bottom:-10,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:18,height:18,background:"rgba(10,10,20,.97)",borderRight:`2.5px solid ${c}`,borderBottom:`2.5px solid ${c}`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:14,color:"#7a7a6e",textTransform:"uppercase",letterSpacing:4}}>Basic Strategy</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:24,padding:0,lineHeight:1}}>×</button>
      </div>
      <div style={{fontSize:32,fontWeight:"bold",color:c,marginBottom:6,fontFamily:"'Playfair Display','Georgia',serif"}}>{advice.a}</div>
      <div style={{fontSize:18,color:"#bbb0a0",lineHeight:1.5}}>{advice.r}</div>
    </div>);
}

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */
const PH={SETUP:0,BET:1,INS:2,PLAY:3,DEALER:4,END:5};

export default function App(){
  const [numDk,setNumDk]=useState(2);
  const [numAI,setNumAI]=useState(2);
  const [phase,setPhase]=useState(PH.SETUP);
  const [shoe,setShoe]=useState([]);
  const [bal,setBal]=useState(START_BAL);
  const [bet,setBet]=useState(0);
  const [pls,_setPls]=useState([]);
  const [dlr,_setDlr]=useState({cards:[]});
  const [aPI,_setAPI]=useState(0);
  const [aHI,_setAHI]=useState(0);
  const [msg,setMsg]=useState("");
  const [rnd,setRnd]=useState(0);
  const [hole,setHole]=useState(false);
  const [adv,setAdv]=useState(false);
  const [sndOn,setSndOn]=useState(true);
  const [betChips,setBetChips]=useState([]);
  const [seenCards,setSeenCards]=useState([]);
  const [showCount,setShowCount]=useState(false);
  const [shuffling,setShuffling]=useState(false);
  const [lastBet,setLastBet]=useState(0);
  const [lastBetChips,setLastBetChips]=useState([]);

  const shoeR=useRef([]);
  const plsR=useRef([]);
  const dlrR=useRef({cards:[]});
  const apiR=useRef(0);
  const ahiR=useRef(0);
  const balR=useRef(START_BAL);
  const betR=useRef(0);

  const setPls=useCallback((v)=>{const val=typeof v==='function'?v(plsR.current):v;plsR.current=val;_setPls(val);},[]);
  const setDlr=useCallback((v)=>{const val=typeof v==='function'?v(dlrR.current):v;dlrR.current=val;_setDlr(val);},[]);
  const setAPI=useCallback((v)=>{apiR.current=v;_setAPI(v);},[]);
  const setAHI=useCallback((v)=>{ahiR.current=v;_setAHI(v);},[]);
  const updBal=useCallback((v)=>{setBal(prev=>{const nv=typeof v==='function'?v(prev):v;balR.current=nv;return nv;});},[]);

  useEffect(()=>{S.on=sndOn;},[sndOn]);

  function draw(){const s=[...shoeR.current];if(!s.length)return null;const c=s.pop();shoeR.current=s;setShoe([...s]);setSeenCards(prev=>[...prev,c]);return c;}

  function startGame(){
    S.init();S.btn();const ns=mkShoe(numDk);shoeR.current=ns;setShoe(ns);S.shuffle();
    const names=[...AI_NAMES].sort(()=>Math.random()-.5);
    const ai=[];for(let i=0;i<numAI;i++)ai.push({name:names[i],isHuman:false,skill:AI_SKILL[i%AI_SKILL.length],balance:500+Math.floor(Math.random()*500),hands:[{cards:[],bet:0,result:null,doubled:false,surrendered:false,isSplit:false}],insBet:0});
    const all=[...ai];all.splice(Math.min(1,numAI),0,{name:"You",isHuman:true,skill:null,balance:START_BAL,hands:[{cards:[],bet:0,result:null,doubled:false,surrendered:false,isSplit:false}],insBet:0});
    setPls(all);updBal(()=>START_BAL);setDlr({cards:[]});setPhase(PH.BET);setRnd(1);setBet(0);betR.current=0;setBetChips([]);setSeenCards([]);setLastBet(0);setLastBetChips([]);setMsg("Place your bet!");setHole(false);setAdv(false);
  }

  function addChip(v){S.init();const nb=betR.current+v;if(nb>Math.min(balR.current,MAX_BET))return;S.chip();setBet(nb);betR.current=nb;
    setBetChips(prev=>[...prev,v]);
    const np=plsR.current.map(p=>p.isHuman?{...p,hands:[{...p.hands[0],bet:nb}]}:p);
    setPls(np);
  }
  function clearBet(){S.btn();setBet(0);betR.current=0;setBetChips([]);
    const np=plsR.current.map(p=>p.isHuman?{...p,hands:[{...p.hands[0],bet:0}]}:p);
    setPls(np);
  }
  function repeatBet(){S.init();S.btn();
    const rb=Math.min(lastBet,balR.current,MAX_BET);if(rb<MIN_BET)return;
    setBet(rb);betR.current=rb;setBetChips([...lastBetChips]);
    const np=plsR.current.map(p=>p.isHuman?{...p,hands:[{...p.hands[0],bet:rb}]}:p);setPls(np);S.chip();
  }

  function placeBet(){
    const curBet=betR.current;
    if(curBet<MIN_BET){setMsg(`Minimum bet is $${MIN_BET}`);return;}S.btn();
    setLastBet(curBet);setLastBetChips([...betChips]);
    setBetChips([]);
    const np=plsR.current.map(p=>{
      if(p.isHuman) return {...p,balance:p.balance-curBet,hands:[{cards:[],bet:curBet,result:null,doubled:false,surrendered:false,isSplit:false}],insBet:0};
      const ab=aiBet(p.skill,p.balance);return {...p,balance:p.balance-ab,hands:[{cards:[],bet:ab,result:null,doubled:false,surrendered:false,isSplit:false}],insBet:0};
    });
    updBal(b=>b-curBet);
    /* 🍀 Lucky $77 */
    if(curBet===77){
      const s=shoeR.current;const hi=np.findIndex(p=>p.isHuman);const n=np.length;
      const pos1=s.length-1-hi, pos2=s.length-1-(n+1)-hi;
      if(pos2>=0){
        const aceIdx=s.findIndex(c=>c.rank==="A");
        const tenIdx=s.findIndex((c,i)=>i!==aceIdx&&"10JQK".includes(c.rank));
        if(aceIdx>=0&&tenIdx>=0){
          /* swap ace into pos1 */
          const tmp1=s[pos1];s[pos1]=s[aceIdx];s[aceIdx]=tmp1;
          /* ten might have moved if it was at pos1 */
          const realTenIdx=tenIdx===pos1?aceIdx:tenIdx;
          /* swap ten into pos2 */
          const tmp2=s[pos2];s[pos2]=s[realTenIdx];s[realTenIdx]=tmp2;
          shoeR.current=s;setShoe([...s]);
        }
      }
    }
    const nd={cards:[]};for(let r=0;r<2;r++){for(let i=0;i<np.length;i++)np[i].hands[0].cards.push(draw());nd.cards.push(draw());}
    setTimeout(()=>S.card(),80);setTimeout(()=>S.card(),250);setTimeout(()=>S.card(),420);
    setPls(np);setDlr(nd);setHole(false);
    if(nd.cards[0].rank==="A"){setPhase(PH.INS);setMsg("Dealer shows an Ace — Insurance?");return;}
    if(isBJ(nd.cards)){resolve(np,nd,true);return;}
    beginPlay(np,nd);
  }

  function handleIns(yes){
    S.btn();const np=plsR.current.map(p=>({...p}));const hi=np.findIndex(p=>p.isHuman);
    if(yes){const ins=Math.min(Math.floor(betR.current/2),balR.current);np[hi].insBet=ins;np[hi].balance-=ins;updBal(b=>b-ins);S.chip();}
    for(let i=0;i<np.length;i++)if(!np[i].isHuman&&np[i].skill!=="basic_strategy"&&Math.random()>.7){const ia=Math.min(Math.floor(np[i].hands[0].bet/2),np[i].balance);np[i].insBet=ia;np[i].balance-=ia;}
    setPls(np);if(isBJ(dlrR.current.cards)){resolve(np,dlrR.current,true);return;}
    setMsg("No Blackjack — insurance lost.");const np2=np.map(p=>({...p,insBet:0}));setPls(np2);beginPlay(np2,dlrR.current);
  }

  function beginPlay(ps,dl){
    const up=ps.map(p=>isBJ(p.hands[0].cards)?{...p,hands:[{...p.hands[0],result:"BLACKJACK"}]}:p);
    setPls(up);let f=up.findIndex(p=>!p.hands[0].result);
    if(f===-1){dealerGo(up,dl);return;}
    setAPI(f);setAHI(0);setPhase(PH.PLAY);setAdv(false);
    if(!up[f].isHuman){setMsg(`${up[f].name} is thinking...`);setTimeout(()=>runAI(f,0),900);}else setMsg("Your turn!");
  }

  function act(a){
    S.btn();setAdv(false);
    const ps=plsR.current.map(p=>({...p,hands:p.hands.map(h=>({...h,cards:[...h.cards]}))}));
    const pi=apiR.current,hi=ahiR.current,p=ps[pi],h=p.hands[hi];
    if(a==="hit"){h.cards.push(draw());S.card();if(hv(h.cards)>21){h.result="BUST";setPls(ps);advance(ps,pi,hi);}else if(hv(h.cards)===21){setPls(ps);advance(ps,pi,hi);}else setPls(ps);}
    else if(a==="stand"){advance(ps,pi,hi);}
    else if(a==="double"){const ex=Math.min(h.bet,p.isHuman?balR.current:p.balance);h.doubled=true;h.bet+=ex;if(p.isHuman){updBal(b=>b-ex);p.balance-=ex;}else p.balance-=ex;h.cards.push(draw());S.card();S.chip();if(hv(h.cards)>21)h.result="BUST";setPls(ps);advance(ps,pi,hi);}
    else if(a==="split"){if(!canSp(h))return;const ex=Math.min(h.bet,p.isHuman?balR.current:p.balance);if(p.isHuman){updBal(b=>b-ex);p.balance-=ex;}else p.balance-=ex;S.chip();S.card();p.hands=[{cards:[h.cards[0],draw()],bet:h.bet,result:null,doubled:false,surrendered:false,isSplit:true},{cards:[h.cards[1],draw()],bet:ex,result:null,doubled:false,surrendered:false,isSplit:true}];setPls(ps);setAHI(0);if(!p.isHuman)setTimeout(()=>runAI(pi,0),700);else setMsg("Playing split hand 1...");return;}
    else if(a==="surrender"){h.surrendered=true;h.result="SURRENDER";const ref=Math.floor(h.bet/2);h.bet-=ref;if(p.isHuman){updBal(b=>b+ref);p.balance+=ref;}else p.balance+=ref;setPls(ps);advance(ps,pi,hi);}
  }

  function advance(ps,pi,hi){
    const p=ps[pi];
    if(hi<p.hands.length-1){const n=hi+1;setAHI(n);setPls([...ps]);if(!p.isHuman)setTimeout(()=>runAI(pi,n),700);else setMsg(`Split hand ${n+1}...`);return;}
    let n=pi+1;while(n<ps.length&&ps[n].hands.every(h=>h.result))n++;
    if(n>=ps.length){setPls([...ps]);dealerGo(ps,dlrR.current);return;}
    setAPI(n);setAHI(0);setPls([...ps]);setAdv(false);
    if(!ps[n].isHuman){setMsg(`${ps[n].name} is thinking...`);setTimeout(()=>runAI(n,0),900);}else setMsg("Your turn!");
  }

  function runAI(pi,hi){
    const ps=plsR.current.map(p=>({...p,hands:p.hands.map(h=>({...h,cards:[...h.cards]}))}));
    const dl=dlrR.current,p=ps[pi];if(!p||hi>=p.hands.length){advAI(ps,pi,hi);return;}
    const h=p.hands[hi];if(h.result){advAI(ps,pi,hi);return;}
    const dec=aiDec(h,dl.cards[0],p.skill);
    if(dec==="double"&&h.cards.length===2&&p.balance>=h.bet){const ex=Math.min(h.bet,p.balance);h.doubled=true;h.bet+=ex;p.balance-=ex;h.cards.push(draw());S.card();if(hv(h.cards)>21)h.result="BUST";setPls(ps);setMsg(`${p.name} doubles!`);setTimeout(()=>advAI(ps,pi,hi),800);}
    else if(dec==="hit"){h.cards.push(draw());S.card();setPls(ps);if(hv(h.cards)>21){h.result="BUST";setMsg(`${p.name} busts!`);setPls([...ps]);setTimeout(()=>advAI(ps,pi,hi),700);}else if(hv(h.cards)===21){setMsg(`${p.name} has 21!`);setTimeout(()=>advAI(ps,pi,hi),700);}else{setMsg(`${p.name} hits...`);setTimeout(()=>runAI(pi,hi),700);}}
    else{setMsg(`${p.name} stands.`);setPls(ps);setTimeout(()=>advAI(ps,pi,hi),700);}
  }
  function advAI(ps,pi,hi){
    const p=ps[pi];const nh=p.hands.findIndex((h,i)=>i>hi&&!h.result);
    if(nh!==-1){setAHI(nh);setTimeout(()=>runAI(pi,nh),700);return;}
    let n=pi+1;while(n<ps.length&&ps[n].hands.every(h=>h.result))n++;
    if(n>=ps.length){setPls([...ps]);dealerGo(ps,dlrR.current);return;}
    setAPI(n);setAHI(0);setPls([...ps]);setAdv(false);
    if(!ps[n].isHuman){setMsg(`${ps[n].name} is thinking...`);setTimeout(()=>runAI(n,0),900);}else setMsg("Your turn!");
  }

  function dealerGo(ps,dl){
    setPhase(PH.DEALER);setHole(true);S.flip();
    if(ps.every(p=>p.hands.every(h=>h.result==="BUST"||h.result==="BLACKJACK"||h.result==="SURRENDER"))){resolve(ps,dl,false);return;}
    const nd={cards:[...dl.cards]};
    function dr(){const v=hv(nd.cards);if(v<17||(v===17&&isSoft(nd.cards))){nd.cards.push(draw());S.card();setDlr({cards:[...nd.cards]});setTimeout(dr,700);}else{setDlr({cards:[...nd.cards]});setTimeout(()=>resolve(ps,{cards:[...nd.cards]},false),600);}}
    setDlr({cards:[...nd.cards]});setMsg("Dealer reveals...");setTimeout(dr,900);
  }

  function resolve(ps,dl,dBJ){
    setHole(true);const dv=hv(dl.cards),bust=dv>21;let hW=false,hL=false;
    const np=ps.map(p=>{const cp={...p};const uh=cp.hands.map(h=>{const ch={...h,cards:[...h.cards]};
      if(ch.result==="BUST"||ch.result==="SURRENDER"){if(cp.isHuman)hL=true;return ch;}
      const pv=hv(ch.cards),pBJ=isBJ(ch.cards)&&!ch.isSplit;
      if(dBJ&&pBJ){cp.balance+=ch.bet;if(cp.isHuman)updBal(b=>b+ch.bet);if(cp.insBet>0){const iw=cp.insBet*3;cp.balance+=iw;if(cp.isHuman)updBal(b=>b+iw);}return{...ch,result:"PUSH"};}
      if(dBJ){if(cp.insBet>0){const iw=cp.insBet*3;cp.balance+=iw;if(cp.isHuman)updBal(b=>b+iw);}if(cp.isHuman)hL=true;return{...ch,result:"LOSE"};}
      if(pBJ){const w=ch.bet+Math.floor(ch.bet*1.5);cp.balance+=w;if(cp.isHuman){updBal(b=>b+w);hW=true;}return{...ch,result:"BLACKJACK"};}
      if(bust||pv>dv){const w=ch.bet*2;cp.balance+=w;if(cp.isHuman){updBal(b=>b+w);hW=true;}return{...ch,result:"WIN"};}
      if(pv===dv){cp.balance+=ch.bet;if(cp.isHuman)updBal(b=>b+ch.bet);return{...ch,result:"PUSH"};}
      if(cp.isHuman)hL=true;return{...ch,result:"LOSE"};
    });return{...cp,hands:uh};});
    setTimeout(()=>{if(hW)S.win();else if(hL&&!hW)S.lose();else S.push();},350);
    setPls(np);setDlr(dl);setPhase(PH.END);const hp=np.find(p=>p.isHuman);setMsg(`Round over! ${hp.hands.map(h=>h.result).join(", ")}`);
  }

  function goToBet(hp){
    const nxt=plsR.current.filter(p=>p.isHuman||p.balance>=MIN_BET).map(p=>({...p,hands:[{cards:[],bet:0,result:null,doubled:false,surrendered:false,isSplit:false}],insBet:0}));
    setPls(nxt);setDlr({cards:[]});setBet(0);betR.current=0;setBetChips([]);setPhase(PH.BET);setHole(false);setRnd(r=>r+1);setMsg("Place your bet!");updBal(()=>hp.balance);setAdv(false);
  }

  function nextRound(){
    S.btn();const hp=plsR.current.find(p=>p.isHuman);
    if(hp.balance<MIN_BET){setMsg("Out of chips!");setPhase(PH.SETUP);return;}
    if(shoeR.current.length<RESHUFFLE){
      const ns=mkShoe(numDk);shoeR.current=ns;setShoe(ns);setSeenCards([]);
      setShuffling(true);setMsg("Shuffling the deck...");
      S.shuffle();
      setTimeout(()=>S.shuffle(),1200);
      setTimeout(()=>S.shuffle(),2400);
      setTimeout(()=>{
        setShuffling(false);
        goToBet(hp);
        setMsg("Fresh shoe — place your bet!");
      },4500);
      return;
    }
    goToBet(hp);
  }

  const humanP=pls.find(p=>p.isHuman);
  const humanI=pls.findIndex(p=>p.isHuman);
  const myTurn=phase===PH.PLAY&&aPI===humanI;
  const curH=myTurn?humanP?.hands[aHI]:null;
  const advice=curH&&dlr.cards.length>0&&!curH.result?getAdvice(curH,dlr.cards[0]):null;

  /* ═══════════════════════════════════════════════
     SETUP SCREEN
     ═══════════════════════════════════════════════ */
  if(phase===PH.SETUP) return (
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      background:"radial-gradient(ellipse at center,#1a3a2a,#0d1f17 50%,#060e0a)",fontFamily:"'Georgia',serif",color:"#d4af37",padding:24,overflow:"auto"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center",maxWidth:600,width:"100%",background:"rgba(0,0,0,.45)",borderRadius:28,padding:"48px 48px",border:"2px solid rgba(212,175,55,.3)",boxShadow:"0 24px 80px rgba(0,0,0,.7)"}}>
        <div style={{fontSize:24,letterSpacing:10,marginBottom:8,color:"#b8972e"}}>♠ ♥ ♦ ♣</div>
        <h1 style={{fontSize:62,margin:"0 0 4px",fontFamily:"'Playfair Display',Georgia,serif",color:"#f5d76e",textShadow:"0 3px 16px rgba(245,215,110,.35)",letterSpacing:5}}>BLACKJACK</h1>
        <div style={{fontSize:17,color:"#8a8a6e",marginBottom:44,letterSpacing:5}}>CLASSIC TABLE GAME</div>
        <div style={{marginBottom:30}}>
          <label style={{display:"block",marginBottom:14,fontSize:18,color:"#c9a84c",letterSpacing:3,textTransform:"uppercase"}}>Number of Decks</label>
          <div style={{display:"flex",gap:14,justifyContent:"center"}}>
            {[1,2,3,4].map(n=><button key={n} onClick={()=>{S.init();S.select();setNumDk(n);}} style={{width:72,height:72,borderRadius:16,border:numDk===n?"3px solid #f5d76e":"3px solid rgba(212,175,55,.2)",background:numDk===n?"rgba(245,215,110,.15)":"rgba(255,255,255,.03)",color:numDk===n?"#f5d76e":"#8a8a6e",fontSize:30,fontWeight:"bold",cursor:"pointer",fontFamily:"'Playfair Display','Georgia',serif",transition:"all .25s"}}>{n}</button>)}
          </div>
        </div>
        <div style={{marginBottom:40}}>
          <label style={{display:"block",marginBottom:14,fontSize:18,color:"#c9a84c",letterSpacing:3,textTransform:"uppercase"}}>Other Players</label>
          <div style={{display:"flex",gap:14,justifyContent:"center"}}>
            {[1,2,3].map(n=><button key={n} onClick={()=>{S.init();S.select();setNumAI(n);}} style={{width:72,height:72,borderRadius:16,border:numAI===n?"3px solid #f5d76e":"3px solid rgba(212,175,55,.2)",background:numAI===n?"rgba(245,215,110,.15)":"rgba(255,255,255,.03)",color:numAI===n?"#f5d76e":"#8a8a6e",fontSize:30,fontWeight:"bold",cursor:"pointer",fontFamily:"'Playfair Display','Georgia',serif",transition:"all .25s"}}>{n}</button>)}
          </div>
        </div>
        <div style={{fontSize:16,color:"#6b7a5e",marginBottom:32,lineHeight:2.2}}>
          Starting Balance: <span style={{color:"#d4af37",fontWeight:"bold"}}>$750</span> · Limits: <span style={{color:"#d4af37",fontWeight:"bold"}}>$5 – $500</span><br/>
          Blackjack pays <span style={{color:"#d4af37",fontWeight:"bold"}}>3:2</span> · Dealer hits soft 17
        </div>
        <button onClick={startGame} style={{padding:"18px 64px",fontSize:24,fontWeight:"bold",letterSpacing:5,background:"linear-gradient(180deg,#d4af37,#b8972e)",color:"#1a1a0e",border:"none",borderRadius:16,cursor:"pointer",fontFamily:"'Playfair Display','Georgia',serif",textTransform:"uppercase",boxShadow:"0 6px 28px rgba(212,175,55,.35)",transition:"all .25s"}}
          onMouseOver={e=>e.target.style.transform="translateY(-3px) scale(1.03)"} onMouseOut={e=>e.target.style.transform="none"}>Take a Seat</button>
      </div>
    </div>);

  /* ═══════════════════════════════════════════════
     GAME TABLE — realistic blackjack layout
     ═══════════════════════════════════════════════ */
  const dlrVal=hole?hv(dlr.cards):(dlr.cards.length>0?cv(dlr.cards[0]):0);
  const dlrBJ=hole&&isBJ(dlr.cards);

  return (
    <div style={{width:"100vw",height:"100vh",display:"flex",flexDirection:"column",
      background:"#0a1008",fontFamily:"'Georgia',serif",color:"#e8e0c8",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* TOP BAR */}
      <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",padding:"8px 20px",background:"rgba(0,0,0,.7)",borderBottom:"2px solid #2a1a0a",flexShrink:0,gap:18}}>
          <span style={{color:"#d4af37",fontWeight:"bold",fontSize:26,fontFamily:"'Playfair Display','Georgia',serif",letterSpacing:4}}>♠ BLACKJACK</span>
          <span style={{color:"#8a8a6e",fontSize:18}}>Round {rnd}</span>
          <span style={{color:shoe.length<RESHUFFLE+10&&shoe.length>0?"#e67e22":"#8a8a6e",fontSize:18}}>{shoe.length} cards{shoe.length>0&&shoe.length<RESHUFFLE+10?" ⚠":""}</span>
          <span style={{color:"#d4af37",fontWeight:"bold",fontSize:26,background:bal>START_BAL?"linear-gradient(90deg,#d4af37,#f5d76e,#d4af37)":"none",backgroundSize:"200% auto",WebkitBackgroundClip:bal>START_BAL?"text":"unset",WebkitTextFillColor:bal>START_BAL?"transparent":"#d4af37",animation:bal>START_BAL?"shimmer 3s linear infinite":"none"}}>Balance: ${bal}</span>
          <button onClick={()=>{S.init();setSndOn(s=>!s);}} style={{background:"none",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:12,color:sndOn?"#d4af37":"#555",cursor:"pointer",padding:"6px 14px",fontSize:24,minWidth:50,minHeight:46}}>{sndOn?"🔊":"🔇"}</button>
          <button onClick={()=>{S.btn();setShowCount(v=>!v);}} style={{background:showCount?"rgba(245,215,110,.15)":"rgba(255,255,255,.08)",border:"1.5px solid rgba(212,175,55,.35)",borderRadius:12,color:"#d4af37",cursor:"pointer",padding:"6px 14px",fontSize:18,minHeight:46,letterSpacing:1}}>🃏 Count</button>
          <button onClick={()=>{S.btn();setPhase(PH.SETUP);}} style={{padding:"8px 18px",fontSize:18,background:"rgba(255,255,255,.08)",color:"#8a8a6e",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:12,cursor:"pointer",minHeight:46}}>New Game</button>
      </div>

      {/* TABLE FELT — semicircle: flat edge at top (dealer), curved bottom (players) */}
      <div style={{flex:1,position:"relative",overflow:"hidden"}}>
        {/* SVG table — semicircle opening downward */}
        <svg viewBox="0 0 1000 620" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
          <defs>
            <radialGradient id="feltG" cx="50%" cy="0%" r="100%">
              <stop offset="0%" stopColor="#1f7a42"/>
              <stop offset="35%" stopColor="#1a6d3a"/>
              <stop offset="60%" stopColor="#145a2e"/>
              <stop offset="85%" stopColor="#0e4422"/>
              <stop offset="100%" stopColor="#082e16"/>
            </radialGradient>
          </defs>
          {/* Wood surround */}
          <path d="M 20,-10 L 980,-10 A 480,560 0 0,1 20,-10 Z" fill="#1a1008" stroke="#4d3a1a" strokeWidth="3"/>
          <path d="M 28,-4 L 972,-4 A 472,550 0 0,1 28,-4 Z" fill="#2a1a0a" stroke="#3d2a14" strokeWidth="2"/>
          {/* Green felt */}
          <path d="M 40,0 L 960,0 A 460,540 0 0,1 40,0 Z" fill="url(#feltG)"/>
          {/* Decorative gold border inside felt */}
          <path d="M 70,6 L 930,6 A 430,510 0 0,1 70,6 Z" fill="none" stroke="rgba(241,210,65,0.16)" strokeWidth="1.5" strokeDasharray="10 7"/>
          {/* Insurance arc */}
          <path d="M 180,120 A 340,360 0 0,1 820,120" fill="none" stroke="rgba(241,210,65,0.12)" strokeWidth="1.5"/>
          {/* Table text — centered in gap between dealer and player arc */}
          <text x="500" y="195" textAnchor="middle" fill="rgba(241,210,65,0.3)" fontSize="22" fontFamily="Playfair Display,Georgia,serif" letterSpacing="8">BLACKJACK PAYS 3 TO 2</text>
          <text x="500" y="222" textAnchor="middle" fill="rgba(241,210,65,0.2)" fontSize="13" fontFamily="Georgia,serif" letterSpacing="4">DEALER MUST HIT SOFT 17</text>
          <text x="500" y="250" textAnchor="middle" fill="rgba(241,210,65,0.2)" fontSize="13" fontFamily="Georgia,serif" letterSpacing="5">INSURANCE PAYS 2 TO 1</text>
        </svg>

        {/* MESSAGE overlay */}
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:5,textAlign:"center",padding:"10px 20px",
          fontSize:24,color:"#f5d76e",fontWeight:"bold",letterSpacing:3}}>
          {msg}
        </div>

        {/* CARD COUNTING PANEL */}
        {showCount&&(
          <div style={{position:"absolute",top:8,right:8,zIndex:50,background:"rgba(6,14,10,.94)",border:"1.5px solid rgba(212,175,55,.35)",borderRadius:16,padding:"16px 20px",minWidth:280,maxHeight:"calc(100% - 16px)",overflowY:"auto",boxShadow:"0 12px 40px rgba(0,0,0,.7)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:16,color:"#d4af37",fontWeight:"bold",letterSpacing:3,textTransform:"uppercase"}}>🃏 Card Count</span>
              <button onClick={()=>setShowCount(false)} style={{background:"none",border:"none",color:"#666",cursor:"pointer",fontSize:22,padding:0,lineHeight:1}}>×</button>
            </div>
            <div style={{fontSize:12,color:"#8a8a6e",marginBottom:10}}>
              {seenCards.length} of {shoe.length+seenCards.length} cards seen
              <div style={{marginTop:4,height:4,background:"rgba(255,255,255,.08)",borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",background:"linear-gradient(90deg,#d4af37,#f5d76e)",borderRadius:2,width:`${(seenCards.length/(shoe.length+seenCards.length||1))*100}%`,transition:"width .3s"}}/>
              </div>
            </div>
            {SUITS.map(suit=>{
              const suitColor=SUIT_CLR[suit];
              const seenInSuit=seenCards.filter(c=>c.suit===suit);
              const seenRanks={};seenInSuit.forEach(c=>{seenRanks[c.rank]=(seenRanks[c.rank]||0)+1;});
              const totalInSuit=numDk;
              return (
                <div key={suit} style={{marginBottom:10}}>
                  <div style={{fontSize:18,color:suitColor==="#1a1a2e"?"#aab":"#c0392b",fontWeight:"bold",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:22}}>{suit}</span>
                    <span style={{fontSize:12,color:"#8a8a6e",fontWeight:"normal"}}>{seenInSuit.length}/{13*numDk}</span>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                    {RANKS.map(rank=>{
                      const count=seenRanks[rank]||0;
                      const allSeen=count>=totalInSuit;
                      return (
                        <div key={rank} style={{width:32,height:38,borderRadius:4,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                          background:allSeen?"rgba(212,175,55,.15)":count>0?"rgba(255,255,255,.08)":"rgba(255,255,255,.02)",
                          border:allSeen?"1px solid rgba(212,175,55,.4)":count>0?"1px solid rgba(255,255,255,.15)":"1px solid rgba(255,255,255,.05)",
                          opacity:allSeen?.4:1}}>
                          <span style={{fontSize:12,fontWeight:"bold",color:suitColor==="#1a1a2e"?"#aab":"#e07070",lineHeight:1}}>{rank}</span>
                          <span style={{fontSize:9,color:count>0?"#d4af37":"#555",lineHeight:1,marginTop:1}}>{count}/{totalInSuit}</span>
                        </div>);
                    })}
                  </div>
                </div>);
            })}
            <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:8,marginTop:4}}>
              <div style={{fontSize:12,color:"#8a8a6e",marginBottom:6}}>Running Count (Hi-Lo)</div>
              {(()=>{
                let rc=0;seenCards.forEach(c=>{const v=cv(c);if(v<=6)rc++;else if(v>=10)rc--;});
                const decksRem=Math.max((shoe.length)/52,.5);
                const tc=Math.round(rc/decksRem*10)/10;
                return (
                  <div style={{display:"flex",gap:16}}>
                    <div><span style={{fontSize:10,color:"#666"}}>RC: </span><span style={{fontSize:18,fontWeight:"bold",color:rc>0?"#27ae60":rc<0?"#e74c3c":"#d4af37"}}>{rc>0?"+":""}{rc}</span></div>
                    <div><span style={{fontSize:10,color:"#666"}}>TC: </span><span style={{fontSize:18,fontWeight:"bold",color:tc>0?"#27ae60":tc<0?"#e74c3c":"#d4af37"}}>{tc>0?"+":""}{tc}</span></div>
                  </div>);
              })()}
            </div>
          </div>
        )}

        {/* DEALER — at top center, along the flat edge */}
        <div style={{position:"absolute",top:"4%",left:"50%",transform:"translateX(-50%)",zIndex:5,
          display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
          <div style={{fontSize:18,color:"rgba(212,175,55,.45)",letterSpacing:4,textTransform:"uppercase",fontWeight:"bold",
            background:"rgba(0,0,0,.3)",padding:"4px 20px",borderRadius:10}}>Dealer</div>
          {dlr.cards.length>0&&(
            <div style={{display:"flex",justifyContent:"center"}}>
              {dlr.cards.map((c,i)=>(
                <Card key={`d${c.rank}${c.suit}${i}`} card={c} faceDown={!hole&&i===1} animated delay={i*.12}
                  style={{marginLeft:i>0?-22:0,zIndex:i,position:"relative"}}/>
              ))}
            </div>
          )}
          {dlr.cards.length>0&&(
            <span style={{fontSize:24,fontWeight:"bold",color:"#fff",background:"rgba(0,0,0,.55)",padding:"4px 16px",borderRadius:12,letterSpacing:2}}>
              {hole?(dlrBJ?"BLACKJACK! 🃏":hv(dlr.cards)):`${cv(dlr.cards[0])} + ?`}
            </span>
          )}
        </div>

        {/* PLAYERS — positioned along the semicircular arc curving around dealer */}
        {pls.map((p,pi)=>{
          const n=pls.length;
          // Arc from 210° (lower-left) through 270° (bottom) to 330° (lower-right)
          const startA=210*(Math.PI/180);
          const endA=330*(Math.PI/180);
          const ang=n===1?270*(Math.PI/180):startA+(endA-startA)*(pi/(n-1));
          // Arc center near top (dealer), radius pushes players down and to sides
          const cx=50, cy=5; // center of arc in %
          const rx=42, ry=70; // radii in % of container
          const px=cx+rx*Math.cos(ang);
          const py=cy-ry*Math.sin(ang); // -sin because CSS Y is inverted vs math

          return (
            <div key={pi} style={{
              position:"absolute",left:`${px}%`,top:`${py}%`,
              transform:"translate(-50%,-50%)",
              zIndex:p.isHuman?10:5,
            }}>
              <PlayerSeat player={p} pi={pi} activePI={aPI} activeHI={aHI} phase={phase} dealerCards={dlr.cards} showHole={hole} betChips={betChips}/>
            </div>
          );
        })}
      </div>

      {/* SHUFFLE ANIMATION OVERLAY */}
      {shuffling&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(4,8,4,.92)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"shuffleOverlayIn .5s ease both"}}>
          <div style={{position:"relative",width:300,height:220,marginBottom:30}}>
            {[
              {anim:"shuffleCard1",x:0,y:0,rot:-12,delay:0},
              {anim:"shuffleCard2",x:40,y:-5,rot:8,delay:.15},
              {anim:"shuffleCard3",x:80,y:2,rot:-4,delay:.3},
              {anim:"shuffleCard4",x:20,y:15,rot:16,delay:.45},
              {anim:"shuffleCard5",x:60,y:10,rot:-8,delay:.6},
              {anim:"shuffleCard6",x:100,y:-8,rot:3,delay:.75},
            ].map((c,i)=>(
              <div key={i} style={{position:"absolute",left:c.x,top:50+c.y,width:90,height:130,borderRadius:10,
                background:"linear-gradient(135deg,#8b0000,#a20000,#8b0000)",border:"2.5px solid #555",
                boxShadow:"3px 4px 16px rgba(0,0,0,.6)",
                animation:`${c.anim} 1.8s cubic-bezier(.25,.46,.45,.94) ${c.delay}s infinite alternate, shuffleRiffle .4s ease ${c.delay+.8}s infinite`,
                transform:`rotate(${c.rot}deg)`}}>
                <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,.04) 5px,rgba(255,255,255,.04) 6px)",borderRadius:8}}/>
                <div style={{position:"absolute",inset:6,border:"1.5px solid rgba(255,200,100,.15)",borderRadius:5}}/>
                <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:28,opacity:.2,color:"#ffd700"}}>♠</div>
              </div>
            ))}
            <div style={{position:"absolute",left:115,top:55,width:90,height:130,animation:"shuffleFan .6s ease-in-out infinite alternate"}}>
              {[0,1,2,3,4].map(i=>(
                <div key={i} style={{position:"absolute",left:i*1.5,top:-i*1.5,width:90,height:130,borderRadius:10,
                  background:"linear-gradient(135deg,#7a0000,#900000,#7a0000)",border:"2px solid #444",
                  boxShadow:"1px 2px 6px rgba(0,0,0,.4)"}}>
                  <div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,.03) 5px,rgba(255,255,255,.03) 6px)",borderRadius:8}}/>
                </div>
              ))}
            </div>
          </div>
          <div style={{fontSize:36,fontWeight:"bold",color:"#d4af37",fontFamily:"'Playfair Display','Georgia',serif",
            letterSpacing:10,animation:"shuffleTextPulse 1.5s ease-in-out infinite",marginBottom:16}}>
            SHUFFLING
          </div>
          <div style={{fontSize:18,color:"#8a8a6e",letterSpacing:4,marginBottom:8}}>
            {numDk} deck{numDk>1?"s":""} · {numDk*52} cards
          </div>
          <div style={{fontSize:16,color:"#e67e22",letterSpacing:2,marginBottom:30,animation:"pulse 1s ease-in-out infinite"}}>
            🃏 Card count reset
          </div>
          <div style={{width:280,height:6,background:"rgba(255,255,255,.08)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,#d4af37,#f5d76e,#d4af37)",borderRadius:3,
              animation:"shuffleProgressFill 4.2s ease-in-out both"}}/>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div style={{padding:"clamp(8px,1.5vh,16px) 20px",background:"linear-gradient(180deg,#1a1008,#0f0a04)",borderTop:"2px solid #2a1a0a",flexShrink:0}}>

        {phase===PH.BET&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"clamp(8px,1.2vh,14px)"}}>
            <div style={{display:"flex",gap:"clamp(6px,.8vw,12px)",flexWrap:"wrap",justifyContent:"center"}}>
              {CHIPS.map(v=><Chip key={v} value={v} size={88} onClick={addChip} disabled={bet+v>Math.min(bal,MAX_BET)}/>)}
            </div>
            <div style={{display:"flex",gap:20,alignItems:"center"}}>
              <span style={{fontSize:38,fontWeight:"bold",color:"#f5d76e",fontFamily:"'Playfair Display','Georgia',serif",minWidth:90,textAlign:"center"}}>${bet}</span>
              <button onClick={clearBet} style={{padding:"12px 28px",fontSize:20,background:"rgba(255,255,255,.08)",color:"#aaa",border:"1.5px solid rgba(255,255,255,.12)",borderRadius:14,cursor:"pointer",minHeight:52}}>Clear</button>
              {lastBet>0&&<button onClick={repeatBet} disabled={lastBet>Math.min(bal,MAX_BET)} style={{padding:"12px 28px",fontSize:20,fontWeight:"bold",background:lastBet<=Math.min(bal,MAX_BET)?"rgba(212,175,55,.15)":"rgba(255,255,255,.04)",color:lastBet<=Math.min(bal,MAX_BET)?"#d4af37":"#555",border:"1.5px solid rgba(212,175,55,.35)",borderRadius:14,cursor:lastBet<=Math.min(bal,MAX_BET)?"pointer":"not-allowed",minHeight:52,letterSpacing:1}}>🔁 ${lastBet}</button>}
              <button onClick={placeBet} disabled={bet<MIN_BET} style={{padding:"14px 52px",fontSize:26,fontWeight:"bold",letterSpacing:5,background:bet>=MIN_BET?"linear-gradient(180deg,#d4af37,#b8972e)":"rgba(255,255,255,.05)",color:bet>=MIN_BET?"#1a1a0e":"#555",border:"none",borderRadius:16,cursor:bet>=MIN_BET?"pointer":"not-allowed",fontFamily:"'Playfair Display','Georgia',serif",textTransform:"uppercase",minHeight:58}}>Deal</button>
            </div>
          </div>
        )}

        {phase===PH.INS&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
            <div style={{fontSize:24,color:"#f5d76e"}}>Insurance costs ${Math.min(Math.floor(bet/2),bal)}</div>
            <div style={{display:"flex",gap:16}}>
              <button onClick={()=>handleIns(true)} disabled={bal<Math.floor(bet/2)} style={{padding:"14px 40px",fontSize:22,fontWeight:"bold",background:"linear-gradient(180deg,#27ae60,#1e8449)",color:"#fff",border:"none",borderRadius:16,cursor:"pointer",minHeight:56}}>Yes, Insure</button>
              <button onClick={()=>handleIns(false)} style={{padding:"14px 40px",fontSize:22,fontWeight:"bold",background:"rgba(255,255,255,.08)",color:"#ccc",border:"1.5px solid rgba(255,255,255,.15)",borderRadius:16,cursor:"pointer",minHeight:56}}>No Thanks</button>
            </div>
          </div>
        )}

        {phase===PH.PLAY&&myTurn&&curH&&!curH.result&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
            <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
              <ActBtn label="Hit" onClick={()=>act("hit")} color="#27ae60"/>
              <ActBtn label="Stand" onClick={()=>act("stand")} color="#c0392b"/>
              <ActBtn label="Double" onClick={()=>act("double")} disabled={curH.cards.length!==2||bal<curH.bet} color="#2980b9"/>
              <ActBtn label="Split" onClick={()=>act("split")} disabled={!canSp(curH)||bal<curH.bet} color="#8e44ad"/>
              <ActBtn label="Surrender" onClick={()=>act("surrender")} disabled={curH.cards.length!==2||curH.isSplit} color="#7f8c8d"/>
            </div>
            <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}}>
              {adv&&advice&&<StratTip advice={advice} onClose={()=>setAdv(false)}/>}
              <button onClick={()=>{S.btn();setAdv(a=>!a);}} style={{padding:"10px 30px",fontSize:20,fontWeight:"bold",background:adv?"rgba(245,215,110,.15)":"rgba(255,255,255,.06)",color:"#d4af37",border:"1.5px solid rgba(212,175,55,.35)",borderRadius:26,cursor:"pointer",letterSpacing:3,transition:"all .25s",minHeight:50}}>💡 What should I do?</button>
            </div>
          </div>
        )}

        {phase===PH.PLAY&&!myTurn&&<div style={{textAlign:"center",color:"#8a8a6e",fontSize:22,padding:12,animation:"pulse 1.5s ease-in-out infinite"}}>Waiting for other players...</div>}
        {phase===PH.DEALER&&<div style={{textAlign:"center",color:"#f5d76e",fontSize:24,padding:12,letterSpacing:3,animation:"pulse 1.2s ease-in-out infinite"}}>Dealer is playing...</div>}

        {phase===PH.END&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
              {humanP.hands.map((h,i)=>{const clr=h.result==="WIN"||h.result==="BLACKJACK"?"#27ae60":h.result==="PUSH"?"#f39c12":"#c0392b";return (<span key={i} style={{fontSize:26,fontWeight:"bold",color:clr,animation:"fadeUp .4s ease both",animationDelay:`${i*.15}s`}}>{humanP.hands.length>1?`Hand ${i+1}: `:""}{h.result}{h.result==="BLACKJACK"?" 🎉":""}</span>);})}
            </div>
            <button onClick={nextRound} style={{padding:"16px 60px",fontSize:26,fontWeight:"bold",letterSpacing:5,background:"linear-gradient(180deg,#d4af37,#b8972e)",color:"#1a1a0e",border:"none",borderRadius:16,cursor:"pointer",fontFamily:"'Playfair Display','Georgia',serif",textTransform:"uppercase",boxShadow:"0 5px 24px rgba(212,175,55,.3)",transition:"all .25s",minHeight:60}}
              onMouseOver={e=>e.target.style.transform="translateY(-3px)"} onMouseOut={e=>e.target.style.transform="none"}>{bal<MIN_BET?"Game Over":"Next Hand"}</button>
          </div>
        )}
      </div>
    </div>);
}
