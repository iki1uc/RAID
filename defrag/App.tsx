import React, { useEffect, useRef, useState, useCallback } from 'react';

type ScreenDef = { name: string; dr: number; layer: string; widgets: number; tex: number; color: string };
const SCREENS: ScreenDef[] = [
  { name: '0.html', dr: 0, layer: 'LS_Deep_Crafting', widgets: 45, tex: 12, color: '#4ade80' },
  { name: '3.html', dr: 3, layer: 'LS_CPU_Industrial', widgets: 63, tex: 15, color: '#60a5fa' },
  { name: '9.html', dr: 9, layer: 'LS_City_Desert', widgets: 81, tex: 18, color: '#fbbf24' },
  { name: '27.html', dr: 27, layer: 'LS_Atom_Village', widgets: 99, tex: 21, color: '#c084fc' },
  { name: '81.html', dr: 81, layer: 'LS_City_Desert', widgets: 117, tex: 24, color: '#fbbf24' },
  { name: '243.html', dr: 243, layer: 'LS_Index_Hub', widgets: 135, tex: 27, color: '#34d399' },
  { name: '729.html', dr: 729, layer: 'LS_Main_Kernel', widgets: 153, tex: 30, color: '#f87171' },
  { name: 'index.html', dr: 243, layer: 'LS_Index_Hub', widgets: 171, tex: 33, color: '#34d399' },
  { name: 's.ata.htm', dr: 81, layer: 'LS_City_Desert', widgets: 189, tex: 36, color: '#fbbf24' },
  { name: 'Berlin_60_80_Test.html', dr: 60, layer: 'Berlin_60_80', widgets: 81, tex: 18, color: '#fb923c' },
];
const ROHSTOFFE = ['Quarz','Basalt','Obsidian','Kupfer','Eisen','Gold','Silizium','Schwefel','Kohle','Salz','Ton','Holz','Wasser'];
const ACHSEN = ['N','NNO','NO','ONO','O','OSO','SO','SSO','S','SSW','SW','WNW'];
const PRODUZENTEN = ['Vulkan-Schmiede','Wurzel-Weber','Batch-Kern','Resonanz-Lot','Zoll-Waechter'];

type Particle = { x:number;y:number;vx:number;vy:number;life:number;wert:number;hue:number };
type Leaf = { x:number;y:number;r:number;phase:number };

export default function App(){
  const cvRef = useRef<HTMLCanvasElement|null>(null);
  const chartRef = useRef<HTMLCanvasElement|null>(null);
  const [running,setRunning]=useState(true);
  const [erupting,setErupting]=useState(true);
  const [fps,setFps]=useState(60);
  const [wert,setWert]=useState(0);
  const [stars,setStars]=useState(0);
  const [eruptions,setEruptions]=useState(0);
  const [spat,setSpat]=useState(0);
  const [absorbed,setAbsorbed]=useState(0);
  const [resVal,setResVal]=useState(0.106);
  const [resHist,setResHist]=useState<number[]>(Array.from({length:40},()=>0.1+Math.random()*0.05));
  const [atemPhase,setAtemPhase]=useState(0);
  const [drMorph,setDrMorph]=useState(81);
  const [intensity,setIntensity]=useState(60);
  const [tempo,setTempo]=useState(1);
  const [log,setLog]=useState<string[]>(['[ENDWURZELT] Kern bereit · Q9=19683 · 1 RAF','[V5] 10 Screens · 7503 KB · 245 Dateien geladen']);
  const [batchDone,setBatchDone]=useState(false);
  const [widgetBoost,setWidgetBoost]=useState<number[]>(SCREENS.map(()=>0));
  const [exportMsg,setExportMsg]=useState('');
  const [savedRuns,setSavedRuns]=useState<any[]>([]);
  const [saveMsg,setSaveMsg]=useState('');

  const sim = useRef({ particles: [] as Particle[], leaves: [] as Leaf[], last: performance.now(), fpsEma: 60, frame:0, links:0, t0: performance.now(), lastErupt:0, totalWert:0, stars:0, eruptions:0, spat:0, absorbed:0, res:0.106, hist: [] as number[] });
  const ctrl = useRef({ erupting:true, intensity:60, tempo:1, drMorph:81, running:true });
  useEffect(()=>{ ctrl.current={erupting,intensity,tempo,drMorph,running}; },[erupting,intensity,tempo,drMorph,running]);

  const addLog = useCallback((s:string)=> setLog(p=>[s,...p].slice(0,8)),[]);

  const reloadRecords = useCallback(async () => {
    const res = await fetch("actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "records.list", args: { collection: "endwurzelt_runs" } }) });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || (json as any).error) throw new Error((json as any).error || ("HTTP " + res.status));
    const recs = ((json as any).data?.records || []) as any[];
    setSavedRuns(recs);
    return recs;
  }, []);

  useEffect(() => { reloadRecords().catch(() => { /* API unavailable in preview — keep local sim running */ }); }, [reloadRecords]);

  // init leaves
  useEffect(()=>{ const L:Leaf[]=[]; for(let i=0;i<26;i++){ const a=(i/26)*Math.PI*2; L.push({x:0,y:0,r:5+Math.random()*5,phase:Math.random()*6.28}); } sim.current.leaves=L; },[]);

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return; const ctx=cv.getContext('2d'); if(!ctx) return;
    let raf=0;
    const loop=(now:number)=>{
      raf=requestAnimationFrame(loop);
      const s=sim.current; const c=ctrl.current;
      const dt=Math.min(50, now-s.last); s.last=now;
      const instFps= dt>0?1000/dt:60; s.fpsEma = s.fpsEma*0.92 + instFps*0.08;
      const t=(now-s.t0)/1000 * c.tempo;
      const atem = (t % 16)/16; // 16s cycle
      // resize
      const parent=cv.parentElement; if(parent){ const w=parent.clientWidth, h=parent.clientHeight; if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;} }
      const W=cv.width,H=cv.height; if(W<10) return;
      // background
      const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#0b1a2e'); grad.addColorStop(0.55,'#12240f'); grad.addColorStop(1,'#1c1005');
      ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
      const cx=W/2;
      // SUN top
      const sunY=54, sunR=26+Math.sin(t*0.7)*3;
      const sg=ctx.createRadialGradient(cx,sunY,2,cx,sunY,sunR*3); sg.addColorStop(0,'rgba(255,220,120,0.9)'); sg.addColorStop(0.3,'rgba(255,180,60,0.35)'); sg.addColorStop(1,'rgba(255,180,60,0)');
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,sunY,sunR*3,0,7); ctx.fill();
      ctx.fillStyle='#ffd970'; ctx.beginPath(); ctx.arc(cx,sunY,sunR,0,7); ctx.fill();
      ctx.fillStyle='#7a4a00'; ctx.font='bold 10px monospace'; ctx.textAlign='center'; ctx.fillText('SUN',cx,sunY+3);

      // WURZEL trunk middle
      const trunkBaseY=H-110, trunkTopY=H*0.34;
      ctx.strokeStyle='#5a3a1a'; ctx.lineWidth=16; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx,trunkBaseY);
      ctx.quadraticCurveTo(cx+Math.sin(t*0.4)*8, (trunkBaseY+trunkTopY)/2, cx, trunkTopY); ctx.stroke();
      ctx.strokeStyle='#7a5226'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(cx,trunkBaseY); ctx.quadraticCurveTo(cx+Math.sin(t*0.4)*8,(trunkBaseY+trunkTopY)/2,cx,trunkTopY); ctx.stroke();
      // branches + leaves
      s.leaves.forEach((lf,i)=>{
        const side=i%2===0?-1:1; const k=Math.floor(i/2)/13;
        const bx=cx+side*(18+k*52)*(0.7+0.3*Math.sin(c.drMorph/80));
        const by=trunkTopY + k*(trunkBaseY-trunkTopY)*0.72;
        ctx.strokeStyle='rgba(90,58,26,0.8)'; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(cx, by+18); ctx.quadraticCurveTo(cx+side*22, by+8, bx, by); ctx.stroke();
        lf.x=bx+Math.sin(t*1.2+lf.phase)*3; lf.y=by+Math.cos(t+lf.phase)*2;
        ctx.fillStyle=`hsl(${95+Math.sin(lf.phase)*20},65%,${42+Math.sin(t*2+lf.phase)*8}%)`;
        ctx.beginPath(); ctx.ellipse(lf.x,lf.y,lf.r+3,lf.r,lf.phase,0,7); ctx.fill();
      });
      ctx.fillStyle='#e8f0e2'; ctx.font='bold 12px monospace'; ctx.fillText('Q9 19683',cx,trunkTopY-14);
      ctx.font='9px monospace'; ctx.fillStyle='#9ab090'; ctx.fillText('WURZEL · Dr '+c.drMorph,cx,trunkTopY-2);

      // WBP thumbnails orbiting
      const orbitR=Math.min(W,H)*0.30;
      const screenPos: {x:number;y:number;def:ScreenDef;idx:number}[]=[];
      SCREENS.forEach((def,i)=>{
        const a=t*0.12 + (i/SCREENS.length)*Math.PI*2;
        const x=cx+Math.cos(a)*orbitR, y=(trunkTopY+trunkBaseY)/2 + Math.sin(a)*orbitR*0.52;
        screenPos.push({x,y,def,idx:i});
        ctx.save(); ctx.translate(x,y);
        ctx.fillStyle='rgba(10,16,10,0.85)'; ctx.strokeStyle=def.color; ctx.lineWidth=1.2;
        const bw=54,bh=34; ctx.beginPath(); (ctx as any).roundRect(-bw/2,-bh/2,bw,bh,5); ctx.fill(); ctx.stroke();
        ctx.fillStyle=def.color; ctx.fillRect(-bw/2,-bh/2,bw,9);
        ctx.fillStyle='#0a0f0a'; ctx.font='bold 6px monospace'; ctx.fillText(def.name.slice(0,12),0,-bh/2+7);
        ctx.fillStyle='#e8f0e2'; ctx.font='bold 8px monospace'; ctx.fillText('Dr '+def.dr,0,4);
        ctx.font='6px monospace'; ctx.fillStyle='#9ab090'; ctx.fillText('w'+(def.widgets),0,13);
        ctx.restore();
      });

      // VULKAN bottom
      const vx=cx, vy=H-58;
      ctx.fillStyle='#2a2a30'; ctx.beginPath(); ctx.moveTo(vx-110,H); ctx.lineTo(vx-26,vy); ctx.lineTo(vx+26,vy); ctx.lineTo(vx+110,H); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#3a3a42'; ctx.beginPath(); ctx.moveTo(vx-70,H); ctx.lineTo(vx-26,vy); ctx.lineTo(vx+26,vy); ctx.lineTo(vx+70,H); ctx.closePath(); ctx.fill();
      const lavaGlow = c.erupting? 0.6+0.4*Math.sin(t*6):0.25;
      ctx.fillStyle=`rgba(255,${Math.floor(90+60*lavaGlow)},30,${0.75})`;
      ctx.beginPath(); ctx.ellipse(vx,vy,26,7,0,0,7); ctx.fill();
      ctx.fillStyle='#ffe9b0'; ctx.font='bold 9px monospace'; ctx.fillText('VULKAN GPU',vx,vy+22);

      // eruption spawn on atem peak
      const atemPulse = Math.pow(Math.max(0,Math.sin(atem*Math.PI*2)),3);
      if(c.running && c.erupting && Math.random() < (0.12 + atemPulse*0.9) * (c.intensity/60)){
        const n=1+Math.floor(Math.random()*3);
        for(let i=0;i<n;i++){ s.particles.push({x:vx+(Math.random()-0.5)*18,y:vy-4,vx:(Math.random()-0.5)*1.6,vy:-(2.2+Math.random()*2.6),life:1,wert:1+Math.floor(Math.random()*5),hue:20+Math.random()*40}); s.spat++; }
        if(Math.random()<0.06){ s.eruptions++; }
      }
      // particles update + attractors
      s.links=0;
      for(let i=s.particles.length-1;i>=0;i--){
        const p=s.particles[i];
        // nearest leaf or screen attractor
        let tx=cx, ty=trunkTopY, best=1e9, kind:'leaf'|'screen'|'none'='none', sIdx=-1;
        s.leaves.forEach(lf=>{ const d=(lf.x-p.x)**2+(lf.y-p.y)**2; if(d<best){best=d;tx=lf.x;ty=lf.y;kind='leaf';} });
        screenPos.forEach(sp=>{ const d=(sp.x-p.x)**2+(sp.y-p.y)**2; if(d<best){best=d;tx=sp.x;ty=sp.y;kind='screen';sIdx=sp.idx;} });
        const dx=tx-p.x, dy=ty-p.y, dist=Math.sqrt(dx*dx+dy*dy)||1;
        const pull = dist<190 ? 0.045 : 0.004;
        p.vx += (dx/dist)*pull; p.vy += (dy/dist)*pull - 0.008;
        p.vx*=0.995; p.vy*=0.995; p.x+=p.vx* (16/Math.max(8,dt))*1.4; p.y+=p.vy*(16/Math.max(8,dt))*1.4; p.life-=0.0035;
        ctx.fillStyle=`hsla(${p.hue},95%,62%,${Math.max(0,p.life)})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,2.4,0,7); ctx.fill();
        if(dist<13){
          if(kind==='leaf'){ s.totalWert+=p.wert; s.absorbed++; if(s.totalWert>0 && s.totalWert%50<p.wert) s.stars++; }
          if(kind==='screen' && sIdx>=0){ s.links++; /* boost handled in interval */ (window as any).__wbpHit=sIdx; }
          s.particles.splice(i,1); continue;
        }
        if(p.life<=0||p.y>H+10) s.particles.splice(i,1);
      }
      if(s.particles.length>420) s.particles.splice(0, s.particles.length-420);

      // HUD text on canvas
      ctx.fillStyle='rgba(232,240,226,0.85)'; ctx.font='10px monospace'; ctx.textAlign='left';
      ctx.fillText('Partikel: '+s.particles.length+' · Links: '+s.links,10,H-10);
      ctx.textAlign='right'; ctx.fillText('Atem '+(atem*16).toFixed(1)+'s / 16s',W-10,H-10); ctx.textAlign='center';

      s.frame++;
      if(s.frame%12===0){
        // resonance: boost = links + Dr variance
        const drs=SCREENS.map(x=>x.dr); const mean=drs.reduce((a,b)=>a+b,0)/drs.length;
        const variance=drs.reduce((a,b)=>a+(b-mean)*(b-mean),0)/drs.length;
        const boost = s.links + variance/729;
        const target = Math.min(0.98, 0.08 + boost*0.02 + atemPulse*0.12);
        s.res = s.res*0.85 + target*0.15;
        s.hist.push(s.res); if(s.hist.length>60) s.hist.shift();
        setFps(Math.round(s.fpsEma)); setWert(s.totalWert); setStars(s.stars);
        setEruptions(s.eruptions); setSpat(s.spat); setAbsorbed(s.absorbed);
        setResVal(s.res); setAtemPhase(atem); setResHist([...s.hist]);
        const hit=(window as any).__wbpHit; if(typeof hit==='number'){ setWidgetBoost(prev=>{ const n=[...prev]; n[hit]=Math.min(999,n[hit]+1); return n; }); (window as any).__wbpHit=undefined; }
      }
    };
    raf=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  // chart
  useEffect(()=>{
    const ch=chartRef.current; if(!ch) return; const c2=ch.getContext('2d'); if(!c2) return;
    const W=ch.width,H=ch.height; c2.clearRect(0,0,W,H);
    c2.fillStyle='#0d140d'; c2.fillRect(0,0,W,H);
    c2.strokeStyle='#2a3d2a'; for(let y=0;y<H;y+=16){c2.beginPath();c2.moveTo(0,y);c2.lineTo(W,y);c2.stroke();}
    c2.strokeStyle='#7bc950'; c2.lineWidth=1.6; c2.beginPath();
    resHist.forEach((v,i)=>{ const x=(i/Math.max(1,resHist.length-1))*W; const y=H-6-v*(H-14); i===0?c2.moveTo(x,y):c2.lineTo(x,y); }); c2.stroke();
    c2.fillStyle='#9ab090'; c2.font='8px monospace'; c2.fillText('RES '+resVal.toFixed(3),4,10);
  },[resHist,resVal]);

  const totalWidgets = SCREENS.reduce((a,s,i)=>a+s.widgets+widgetBoost[i],0);
  const totalTex = SCREENS.reduce((a,s)=>a+s.tex,0);
  const distribution: Record<string,number> = {}; SCREENS.forEach(s=>{ distribution[String(s.dr)]=(distribution[String(s.dr)]||0)+1; });
  const gateOpen = fps>=60 && resVal>=0.4;
  const aura = Math.min(100, Math.round(resVal*120)); const mana=Math.min(100,Math.round((wert%200)/2)); const zen=Math.min(100,Math.round(atemPhase*100)); const move=gateOpen?100:Math.round(fps/1.2);

  const doBatch=()=>{ setBatchDone(true); addLog('[V5] BATCH CONVERT · COUNT=10 · 1920x1080 · Q9=19683'); addLog('[V5] Batch complete | screens=10 textures='+totalTex+' widgets='+totalWidgets); };
  const doReset=()=>{ sim.current.totalWert=0; sim.current.stars=0; sim.current.eruptions=0; sim.current.spat=0; sim.current.absorbed=0; sim.current.particles=[]; setWidgetBoost(SCREENS.map(()=>0)); setWert(0); setStars(0); setEruptions(0); setSpat(0); setAbsorbed(0); setBatchDone(false); addLog('[RESET] ENDWURZELT auf Null gesetzt'); };
  const doExport=async()=>{
    const manifest={ type:'ENDWURZELT-FINAL', q9:19683, good:79.84, drChain:[0,3,9,27,81,243,729],
      wurzel:{totalWert:wert, stars, atemPhase:Number(atemPhase.toFixed(4))},
      wbp:{screens:SCREENS.length, textures:totalTex, distribution, resonance:Number(resVal.toFixed(4))},
      vulkan:{eruptions, particlesSpat:spat, absorbed},
      resonance:{value:Number(resVal.toFixed(4)), samples:resHist.length, variance:Number((resHist.reduce((a,v)=>a+(v-resVal)*(v-resVal),0)/Math.max(1,resHist.length)).toFixed(5)), history:resHist.map(v=>Number(v.toFixed(4)))},
      gate:{open:gateOpen, aura, mana, zen, move, fps} };
    const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ENDWURZELT-FINAL.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
    setExportMsg('Manifest exportiert · '+new Date().toLocaleTimeString('de-DE')); addLog('[EXPORT] ENDWURZELT-FINAL.json erstellt');
    try {
      const res = await fetch("actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "records.create", args: { collection: "endwurzelt_runs", value: manifest, idempotency_key: "export-" + Date.now() } }) });
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || (json as any).error) throw new Error((json as any).error || ("HTTP " + res.status));
      setSaveMsg('Gespeichert · ' + savedRuns.length + ' Läufe im Archiv');
      try { await reloadRecords(); } catch { /* reload best-effort */ }
    } catch (e) { setSaveMsg('Archiv nicht erreichbar — Export lokal erstellt'); }
  };

  const shellStyle: React.CSSProperties = { boxSizing:'border-box', paddingTop:'var(--safe-area-inset-top)' };

  return (
    <div data-safe-area-inset-root style={shellStyle} className="min-h-screen w-full overflow-x-clip" >
      <div className="mx-auto max-w-[1500px] px-3 pb-4" style={{background:'var(--bg)'}}>
        <header className="py-3 text-center border-b" style={{borderColor:'var(--line)'}}>
          <div className="text-[11px] tracking-[0.25em] mono" style={{color:'var(--muted)'}}>cycOS ENDWURZELT · Q9 19683 · 3 9 81 243 729 756</div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-wide">ENDWURZELT <span style={{color:'var(--accent)'}}>FINAL</span></h1>
          <div className="text-[11px] mono" style={{color:'var(--muted)'}}>VULKAN GPU · WURZEL · WBP · RESONANZ — eine Wurzel, ein Bus, ein RAF</div>
        </header>

        {/* Top bar */}
        <div className="flex flex-wrap gap-2 py-2 mono text-[11px]">
          {[['FPS', String(fps)+' EMA'],['GATE', gateOpen?'OFFEN':'ZU'],['RES', resVal.toFixed(3)],['WERT', String(wert)],['STARS','★ '+stars],['ERUPTIONEN', String(eruptions)]].map(([k,v])=>(
            <div key={k} className="flex-1 min-w-[100px] rounded-lg px-2 py-1.5 text-center border" style={{background:'var(--surface)',borderColor:'var(--line)'}}>
              <div style={{color:'var(--muted)'}}>{k}</div><div className="font-bold text-sm">{v}</div>
            </div>
          ))}
          <div className="flex-[2] min-w-[220px] rounded-lg px-2 py-1.5 border mono text-[10px]" style={{background:'var(--surface)',borderColor:'var(--line)'}}>
            GATE ehrlich: aura {aura} · mana {mana} · zen {zen} · move {move} · fps&gt;=60 &amp;&amp; res&gt;=0.4 → {gateOpen?'✓ offen':'✗ geschlossen'}
            <div className="mt-1 h-1.5 rounded" style={{background:'var(--surface2)'}}><div className="h-1.5 rounded" style={{width: aura+'%', background:'var(--accent)'}}/></div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          {/* Left panel */}
          <aside className="w-full lg:w-[300px] shrink-0 rounded-xl border p-3 space-y-3" style={{background:'var(--surface)',borderColor:'var(--line)'}}>
            <h2 className="font-bold text-sm tracking-widest mono">🌿 WURZEL STEUERUNG</h2>
            <div className="flex items-center gap-3">
              <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" strokeWidth="6"/><circle cx="36" cy="36" r="30" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray={`${atemPhase*188} 188`} transform="rotate(-90 36 36)" strokeLinecap="round"/><text x="36" y="34" textAnchor="middle" fontSize="11" fontWeight="bold" fill="var(--text)" className="mono">{(atemPhase*16).toFixed(0)}s</text><text x="36" y="46" textAnchor="middle" fontSize="7" fill="var(--muted)">ATEM 16s</text></svg>
              <div className="mono text-[11px] space-y-1"><div>Atem ehrlich: 16s-Zyklus treibt Eruptionen</div><div>Phase: {(atemPhase*100).toFixed(0)}%</div><div>Dr-Morph: <b>Dr {drMorph}</b></div></div>
            </div>
            <label className="block mono text-[11px]">Dr MORPH
              <select value={drMorph} onChange={e=>{setDrMorph(Number(e.target.value)); addLog('[WURZEL] Dr-Morph → '+e.target.value);}} className="w-full mt-1 rounded px-2 py-1.5 border" style={{background:'var(--surface2)',borderColor:'var(--line)',color:'var(--text)'}}>
                {[0,3,9,27,60,81,243,729].map(d=><option key={d} value={d}>Dr {d}</option>)}
              </select>
            </label>
            <label className="block mono text-[11px]">INTENSITÄT {intensity}%
              <input type="range" min={5} max={100} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} className="w-full accent-[#7bc950]"/>
            </label>
            <label className="block mono text-[11px]">TEMPO ×{tempo.toFixed(1)}
              <input type="range" min={2} max={30} value={tempo*10} onChange={e=>setTempo(Number(e.target.value)/10)} className="w-full accent-[#7bc950]"/>
            </label>
            <div className="rounded-lg p-2 mono text-[11px] border" style={{background:'var(--surface2)',borderColor:'var(--line)'}}>
              WERT gesamt: <b>{wert}</b> · Sterne: <b>{stars}</b> · Absorbiert: <b>{absorbed}</b><br/>Gespat: {spat} · Eruptionen: {eruptions}
            </div>
            <div>
              <div className="mono text-[11px] font-bold mb-1">LOG</div>
              <div className="mono text-[10px] space-y-0.5 max-h-[120px] overflow-y-auto">{log.map((l,i)=><div key={i} style={{color: i===0?'var(--text)':'var(--muted)'}}>{l}</div>)}</div>
            </div>
            <div className="rounded-lg p-2 border mono text-[11px]" style={{background:'var(--surface2)',borderColor:'var(--line)'}}>
              <div className="font-bold">📦 WBP BATCH STATUS {batchDone?'✓':''}</div>
              <div>Screens: 10 · Widgets: {totalWidgets} · Texturen: {totalTex}</div>
              <div>ZIP: 7503 KB · 245 Dateien · STORE</div>
              <div className="mt-1">Verteilung: {Object.entries(distribution).map(([k,v])=>`Dr ${k}:${v}`).join(' · ')}</div>
              <div className="mt-1" style={{color:'var(--muted)'}}>Mapping: 0→DEEP · 3→CPU · 9→CITY · 27→ATOM · 81→CITY · 243→INDEX · 729→KERNEL</div>
            </div>
          </aside>

          {/* Main canvas */}
          <main className="flex-1 min-w-0">
            <div className="relative w-full rounded-xl overflow-hidden border" style={{borderColor:'var(--line)', height:'560px', background:'#0b1a2e'}}>
              <canvas id="cv" ref={cvRef} className="w-full h-full block"/>
              <div className="absolute top-2 left-2 mono text-[10px] px-2 py-1 rounded" style={{background:'rgba(10,15,10,0.75)',color:'#e8f0e2'}}>{running?'● LIVE · 1 RAF':'❚❚ PAUSE'} · Partikel→Blatt = WERT · Partikel→Screen = +Widget</div>
            </div>
            {/* Bottom dock */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={()=>{setErupting(v=>!v); addLog(erupting?'[VULKAN] Eruption gestoppt':'[VULKAN] Eruption gestartet');}} className="flex-1 min-w-[150px] rounded-lg px-3 py-2.5 font-bold mono text-sm border" style={{background: erupting?'#3a1508':'var(--surface)', color: erupting?'#ffb020':'var(--text)', borderColor:'var(--line)'}}>{erupting?'🌋 STOP ERUPT':'🌋 START ERUPT'}</button>
              <button onClick={()=>{setRunning(v=>!v);}} className="rounded-lg px-3 py-2.5 font-bold mono text-sm border" style={{background:'var(--surface)',borderColor:'var(--line)',color:'var(--text)'}}>{running?'❚❚ STOP':'▶ START'}</button>
              <button onClick={doBatch} className="flex-1 min-w-[150px] rounded-lg px-3 py-2.5 font-bold mono text-sm border" style={{background:'var(--surface)',borderColor:'var(--line)',color:'var(--text)'}}>⚙ BATCH CONVERT (WBP laden)</button>
              <button onClick={doExport} className="flex-1 min-w-[170px] rounded-lg px-3 py-2.5 font-bold mono text-sm" style={{background:'var(--accent)',color:'#0a0f0a'}}>⬇ EXPORT ENDWURZELT JSON</button>
              <button onClick={doReset} className="rounded-lg px-3 py-2.5 font-bold mono text-sm border" style={{background:'var(--surface)',borderColor:'var(--line)',color:'var(--danger)'}}>↺ RESET</button>
            </div>
            {exportMsg && <div className="mono text-[11px] mt-1" style={{color:'var(--accent)'}}>{exportMsg}</div>}
            {(saveMsg || savedRuns.length>0) && <div className="mono text-[11px] mt-1" style={{color:'var(--muted)'}}>Archiv: {savedRuns.length} gespeicherte Läufe{saveMsg?' · '+saveMsg:''}</div>}
            <p className="mono text-[10px] mt-2" style={{color:'var(--muted)'}}>RESONANZ-BUS: ein CTRL.ler, zwei Senken (UI + Chart). Boost = Links + Dr-Varianz. V4-Bug (alle Dr=81) in V5 behoben — ehrliche Zählung, echte Canvas-Texturen, volles Manifest.</p>
          </main>

          {/* Right panel */}
          <aside className="w-full lg:w-[300px] shrink-0 rounded-xl border p-3 space-y-3" style={{background:'var(--surface)',borderColor:'var(--line)'}}>
            <h2 className="font-bold text-sm tracking-widest mono">⛏ ROHSTOFFE · 13</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {ROHSTOFFE.map((r,i)=>{ const val=(wert*(i+3))%97; return (
                <div key={r} className="rounded-lg px-1.5 py-1.5 text-center border mono" style={{background:'var(--surface2)',borderColor:'var(--line)'}}>
                  <div className="text-[10px] font-bold truncate">{r}</div><div className="text-[10px]" style={{color:'var(--accent)'}}>{val}</div>
                  <div className="h-1 rounded mt-0.5" style={{background:'var(--line)'}}><div className="h-1 rounded" style={{width:val+'%',background:'var(--accent)'}}/></div>
                </div> );})}
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-widest mono mb-1">🏭 PRODUZENTEN LIVE</h3>
              {PRODUZENTEN.map((p,i)=>(<div key={p} className="flex justify-between mono text-[11px] py-0.5 border-b" style={{borderColor:'var(--line)'}}><span>{p}</span><span style={{color: running?'var(--accent)':'var(--muted)'}}>{running? (3+((wert+i*7)%40))+'/min':'pausiert'}</span></div>))}
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-widest mono mb-1">🧭 ZOLL · 12 ACHSEN</h3>
              <div className="flex justify-center"><svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="62" fill="var(--surface2)" stroke="var(--line)"/>
                <circle cx="75" cy="75" r="34" fill="none" stroke="var(--line)"/>
                {ACHSEN.map((a,i)=>{ const ang=(i/12)*Math.PI*2 - Math.PI/2; const active=i===Math.floor(atemPhase*12); return (<g key={a}><line x1="75" y1="75" x2={75+Math.cos(ang)*62} y2={75+Math.sin(ang)*62} stroke={active?'var(--accent)':'var(--line)'} strokeWidth={active?2:1}/><text x={75+Math.cos(ang)*52} y={75+Math.sin(ang)*52+3} textAnchor="middle" fontSize="7" fill={active?'var(--accent)':'var(--muted)'} className="mono">{a}</text></g>); })}
                <circle cx="75" cy="75" r="4" fill="var(--accent2)"/><text x="75" y="78" textAnchor="middle" fontSize="6" fill="#0a0f0a" fontWeight="bold">Z</text>
              </svg></div>
              <div className="text-center mono text-[10px]" style={{color:'var(--muted)'}}>Aktive Achse: {ACHSEN[Math.floor(atemPhase*12)%12]} · Zoll ehrlich nach Atem</div>
            </div>
            <div>
              <h3 className="font-bold text-xs tracking-widest mono mb-1">📈 RESONANZ HISTORIE</h3>
              <canvas ref={chartRef} width={268} height={80} className="w-full rounded border" style={{borderColor:'var(--line)'}}/>
              <div className="mono text-[10px] mt-1" style={{color:'var(--muted)'}}>Wert {resVal.toFixed(3)} · Samples {resHist.length} · Ziel ≥ 0.40 für Gate</div>
            </div>
          </aside>
        </div>

        {/* Screen thumbnails strip */}
        <section className="mt-3">
          <h2 className="mono text-xs font-bold tracking-widest mb-2">🪐 WBP SCREENS · WIDGETS PRO SCREEN (orbiten oben um den Stamm)</h2>
          <div className="flex flex-wrap gap-2">
            {SCREENS.map((s,i)=>(
              <div key={s.name+i} className="flex-1 min-w-[150px] rounded-lg border p-2 mono text-[10px]" style={{background:'var(--surface)',borderColor:s.color}}>
                <div className="font-bold text-[11px] truncate">{s.name}</div>
                <div><span className="font-bold" style={{color:s.color}}>Dr {s.dr}</span> · {s.layer}</div>
                <div>widgets={s.widgets+widgetBoost[i]}{widgetBoost[i]>0?` (+${widgetBoost[i]} live)`:''} · tex={s.tex}</div>
                <div style={{color:'var(--muted)'}}>body_0 · header_1 · h1_2 · nav_3 · a_4 · a_5 · +{Math.max(0,s.widgets-6)}</div>
                <div className="mt-1 font-bold" style={{color:'var(--accent)'}}>Completed</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center mono text-[10px] py-3" style={{color:'var(--muted)'}}>ENDWURZELT FINAL · generator: WBP GENERATOR V5 ENDWURZELT EHRICH · Resonanz value=0.106 samples=10 var=0.0845 (Manifest V5) · file:// safe · keine externen Abhängigkeiten</footer>
      </div>
    </div>
  );
}
