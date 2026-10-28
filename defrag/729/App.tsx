import { useEffect, useMemo, useRef, useState } from "react";
import { Folder, File, FileCode, FileJson, GitBranch, Eye, Edit3, Copy, Move, Trash2, RefreshCw, HelpCircle, Play, Calculator, Monitor, ListMusic, CheckSquare, Save, X, Sun, Activity } from "lucide-react";
import "./index.css";

type FNode={name:string;type:"dir"|"file";size?:number;ext?:string;date:string;children?:Record<string,FNode>};

function dir(name:string,date:string,children:Record<string,FNode>):FNode{return{name,type:"dir",date,children}}
function file(name:string,size:number,ext:string,date:string):FNode{return{name,type:"file",size,ext,date}}

const gitObjs=["0f","1a","1d","1e","1f","2d","2f","3e","4b","4e","05","5b","6a","6f","7d","8c","09","9d","11","21","26","28"];
const gitChildren:Record<string,FNode>={};
gitObjs.forEach(o=>{gitChildren[o]=dir(o,"Heute 21:47",{
 ...(o==="0f"?{"740698afe1f4022df320865ee7e12221ad7ed7":file("740698afe1f4022df320865ee7e12221ad7ed7",55,"","Heute 21:52"),"cb081511f192d52f4bb508e827ab87a56ff574":file("cb081511f192d52f4bb508e827ab87a56ff574",438,"","Heute 21:52")} :{}),
 ...(o==="1a"?{"c8c31d438f5bcdaaadd840049c84e5bd27d181":file("c8c31d438f5bcdaaadd840049c84e5bd27d181",186,"","Heute 21:53")} :{}),
})});

export const FS:Record<string,FNode>={
 "H:\\hh\\apfel.narr\\0\\": dir("0","Heute 22:19",{
   "Zone-Minimal-FINAL.html":file("Zone-Minimal-FINAL.html",15585,"html","Heute 22:09"),
   "void.tmp.js":file("void.tmp.js",724,"js","Heute 22:04"),
   "index.css":file("index.css",564,"css","Heute 22:01"),
   "App.tsx":file("App.tsx",45421,"tsx","Heute 22:12"),
   ".clippy":dir(".clippy","Heute 22:19",{"vfs-manifest.json":file("vfs-manifest.json",316,"json","Heute 22:19")}),
 }),
 "H:\\hh\\apfel.narr\\9\\.clippy\\": dir(".clippy","Heute 22:19",{"vfs-manifest.json":file("vfs-manifest.json",316,"json","Heute 22:19")}),
 "H:\\hh\\apfel.narr\\.git\\objects\\": dir("objects","Heute 21:47",gitChildren),
 "H:\\hh\\apfel.narr\\.git\\objects\\0f\\": dir("0f","Heute 21:47",{"740698afe1f4022df320865ee7e12221ad7ed7":file("740698afe1f4022df320865ee7e12221ad7ed7",55,"","Heute 21:52"),"cb081511f192d52f4bb508e827ab87a56ff574":file("cb081511f192d52f4bb508e827ab87a56ff574",438,"","Heute 21:52")}),
 "H:\\hh\\apfel.narr\\.git\\objects\\1a\\": dir("1a","Heute 21:47",{"c8c31d438f5bcdaaadd840049c84e5bd27d181":file("c8c31d438f5bcdaaadd840049c84e5bd27d181",186,"","Heute 21:53")}),
 "H:\\hh\\apfel.narr\\.git\\logs\\refs\\heads\\": dir("heads","Heute 21:40",{"main":file("main",184,"","Heute 21:40")}),
 "H:\\hh\\apfel.narr\\.git\\info\\": dir("info","Heute 21:40",{"exclude":file("exclude",240,"","Heute 21:40")}),
};
const PATHS=Object.keys(FS);
const MANIFEST_DEFAULT=JSON.stringify({type:"WGEN-2-BIOTOPIA",version:"2.1",drChain:[81,27,3,0],Q9:19683,WURZEL:"0⊃3⊃9⊃27⊃81⊃243⊃729→730 FREI",PATCHED:true,patch:"TRI-AXIS-SYMBIOSE",axes:{X:32.29,Y:8.16,Z:0.254},vesta:"HERDFEUER IMMER AN",planets:["MERKUR","VENUS","ERDE","MARS","JUPITER","SATURN","URANUS","NEPTUN"],lifecycle:["CO2","ICE","H2O","LIFE","FIRE","CO2"]},null,2);
const HOOKS=["applypatch-msg.sample","commit-msg.sample","fsmonitor-watchman.sample","post-update.sample","pre-applypatch.sample","pre-commit.sample","pre-merge-commit.sample","pre-push.sample","pre-rebase.sample","prepare-commit-msg.sample","push-to-checkout.sample","sendemail-validate.sample","update.sample"];

async function api(action:string,args:any){
  const r=await fetch("actions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,args})});
  const j=await r.json(); if(!r.ok||j.error) throw new Error(j.error||`HTTP ${r.status}`); return j.data;
}

export default function App(){
  const [leftPath,setLeftPath]=useState(PATHS[0]);
  const [rightPath,setRightPath]=useState(PATHS[1]);
  const [active,setActive]=useState<"L"|"R">("L");
  const [selL,setSelL]=useState("Zone-Minimal-FINAL.html");
  const [selR,setSelR]=useState("vfs-manifest.json");
  const [viewer,setViewer]=useState<string|null>(null);
  const [manifest,setManifest]=useState(MANIFEST_DEFAULT);
  const [savedEdits,setSavedEdits]=useState<any[]>([]);
  const [status,setStatus]=useState("cycOS bereit · Ventoy USB · 7 GB frei · H:\\hh\\apfel.narr erkannt");
  const [Xv,setXv]=useState(32.29); const [Yv,setYv]=useState(8.16); const [Zv,setZv]=useState(0.254);
  const [tick,setTick]=useState(0);
  const [hidden,setHidden]=useState<Record<string,boolean>>({});
  const [showGit,setShowGit]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null);

  // TRI calculations
  const R=useMemo(()=> +( (Yv/Xv)+(Zv*0.37) ).toFixed(3),[Xv,Yv,Zv]); // ~0.348 at defaults
  const GOOD=useMemo(()=> Math.min(99.9, Math.max(0, 62 + Yv*1.8 + Zv*12 - Math.abs(Xv-32.29)*0.12 )),[Xv,Yv,Zv]);
  const omega=useMemo(()=> (Xv*Yv*Zv),[Xv,Yv,Zv]);
  const aura=useMemo(()=> Math.min(1, GOOD/100 + Zv*0.08),[GOOD,Zv]);
  const gate=aura>=0.7;
  const co2=useMemo(()=> Math.max(0, 420 - Yv*18 + Xv*0.6),[Xv,Yv]);
  const movePct=useMemo(()=> Math.round(Zv*100),[Zv]);

  useEffect(()=>{ const t=setInterval(()=>setTick(v=>v+1),1200); return ()=>clearInterval(t)},[]);
  useEffect(()=>{ (window as any).FOTO={apfel:{narr:FS,paths:PATHS},TRI:{X:Xv,Y:Yv,Z:Zv,R,GOOD:+GOOD.toFixed(2),OMEGA:+omega.toFixed(3),aura:+aura.toFixed(3),gate},WURZEL:{chain:[0,3,9,27,81,243,729,730],Q9:19683,free:"730 FREI"}}; },[Xv,Yv,Zv,R,GOOD,omega,aura,gate]);

  useEffect(()=>{ (async()=>{ try{ const d=await api("records.list",{collection:"vfs_edits"}); const recs=d.records||[]; setSavedEdits(recs); if(recs.length) setManifest(recs[recs.length-1].value.content); }catch{ /* preview offline */ } })(); },[]);

  async function saveManifest(){
    try{ const rec=await api("records.create",{collection:"vfs_edits",value:{content:manifest,savedAt:new Date().toISOString()},idempotency_key:`vfs-${Date.now()}`}); setSavedEdits(p=>[...p,rec]); setStatus("✓ vfs-manifest.json gespeichert (records.create) — PATCHED aktiv"); }
    catch(e:any){ setStatus("Speichern offline: "+e.message+" — Änderung bleibt lokal sichtbar"); }
  }

  // Canvas tri-axis
  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; const ctx=c.getContext("2d"); if(!ctx) return;
    let raf=0; const planets=["MERKUR","VENUS","ERDE","MARS","JUPITER","SATURN","URANUS","NEPTUN"];
    const draw=(t:number)=>{
      const w=c.width=c.clientWidth*devicePixelRatio, h=c.height=c.clientHeight*devicePixelRatio; ctx.scale(devicePixelRatio,devicePixelRatio);
      const W=c.clientWidth,H=c.clientHeight; ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#02060a"; ctx.fillRect(0,0,W,H);
      // stars
      ctx.fillStyle="rgba(255,215,0,.35)"; for(let i=0;i<70;i++){ ctx.fillRect((i*97+t*0.002)%W,(i*57)%H,1.5,1.5); }
      const cx=W/2, cy=H/2+10; const breath=1+Math.sin(t/900)*0.12;
      // axes: X red, Y green, Z orange — lengths scaled by FORM/ENERGIE/NUTZUNG
      const lx=Xv*4.2*breath, ly=Yv*16*breath, lz=Zv*260*breath;
      const line=(dx:number,dy:number,col:string,label:string)=>{ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+dx,cy+dy);ctx.stroke();ctx.fillStyle=col;ctx.font="700 11px 'IBM Plex Mono'";ctx.fillText(label,cx+dx+6,cy+dy);};
      line(lx,0,"#ff3b30",`X FORM ${Xv.toFixed(2)}`); line(-ly*0.6,-ly,"#2eff6a",`Y ENERGIE ${Yv.toFixed(2)}`); line(lz*0.7,lz*0.45,"#ff9500",`Z NUTZUNG ${Zv.toFixed(3)}`);
      // VESTA sun
      const g=ctx.createRadialGradient(cx,cy,0,cx,cy,46*breath); g.addColorStop(0,"#fff7cc"); g.addColorStop(.4,"#ffd700"); g.addColorStop(1,"rgba(255,149,0,0)"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,46*breath,0,7); ctx.fill();
      ctx.fillStyle="#02060a"; ctx.font="700 9px 'IBM Plex Mono'"; ctx.textAlign="center"; ctx.fillText("VESTA",cx,cy-2); ctx.fillText("HERDFEUER",cx,cy+8); ctx.textAlign="left";
      // planets
      planets.forEach((p,i)=>{ const rad=62+i*16, a=t/(2400+i*700)+i; const px=cx+Math.cos(a)*rad, py=cy+Math.sin(a)*rad*0.62; ctx.fillStyle=i===2?"#4da6ff":"#ffd700"; ctx.beginPath(); ctx.arc(px,py,i===2?4:3,0,7); ctx.fill(); ctx.fillStyle="rgba(232,238,244,.8)"; ctx.font="8px 'IBM Plex Mono'"; if(i%2===0) ctx.fillText(p,px+6,py); });
      // lifecycle bottom
      ctx.fillStyle="rgba(255,215,0,.9)"; ctx.font="10px 'IBM Plex Mono'"; ctx.fillText("CO2 → ICE → H2O → LIFE → FIRE → CO2",14,H-12);
      raf=requestAnimationFrame(draw);
    }; raf=requestAnimationFrame(draw); return ()=>cancelAnimationFrame(raf);
  },[Xv,Yv,Zv]);

  function entries(path:string){ const n=FS[path]; return n?.children?Object.values(n.children):[]; }
  function openFile(pane:"L"|"R",f:FNode){
    if(f.type==="dir"){
      const target=PATHS.find(p=>p.toLowerCase().includes(f.name.toLowerCase()))||PATHS[0];
      if(pane==="L") setLeftPath(target); else setRightPath(target);
      setStatus(`Ordner geöffnet: ${f.name} → ${target}`); return;
    }
    if(f.name==="vfs-manifest.json"){ setViewer("manifest"); setStatus("VFS-Manifest geöffnet — WGEN-2-BIOTOPIA · PATCHED"); return; }
    if(f.name==="main"||f.name==="exclude"||f.name.length>=38){ setViewer("git"); setShowGit(true); setStatus(`Git-Objekt: ${f.name} · ${f.size} Bytes`); return; }
    setViewer("file"); setStatus(`Anzeigen (F3): ${f.name} · ${f.size?.toLocaleString("de-DE")} Bytes · ${f.date}`);
  }

  const Pane=({side,path,setPath,sel,setSel}:{side:"L"|"R",path:string,setPath:any,sel:string,setSel:any})=>{
    const list=entries(path).filter(f=>!hidden[f.ext||""]);
    const total=list.reduce((a,f)=>a+(f.size||0),0);
    return <section onClick={()=>setActive(side)} className={`min-w-0 flex-1 border ${active===side?"border-[var(--gold)]":"border-[var(--line)]"} bg-[var(--surface)] flex flex-col`}>
      <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface2)] border-b border-[var(--line)]">
        <Folder size={14} className="text-[var(--gold)] shrink-0"/><span className="truncate text-[11px] font-bold text-[var(--gold)]">{path}</span>
        <select value={path} onChange={e=>setPath(e.target.value)} className="ml-auto bg-black/60 text-[10px] border border-[var(--line)] px-1 py-0.5 max-w-[150px]">{PATHS.map(p=><option key={p} value={p}>{p}</option>)}</select>
      </div>
      <div className="grid grid-cols-[1fr_52px_64px_86px] text-[10px] text-[var(--muted)] px-2 py-1 border-b border-[var(--line)]"><span>Name</span><span>Er…</span><span className="text-right">Größe</span><span className="text-right">Datum</span></div>
      <div className="overflow-y-auto max-h-[300px]">
        <button onClick={()=>setPath(PATHS[0])} className="w-full grid grid-cols-[1fr_52px_64px_86px] px-2 py-1 text-left text-[11px] hover:bg-white/5"><span>.. [Übergeordnet]</span><span></span><span></span><span className="text-right text-[var(--muted)]">Heute 22:19</span></button>
        {list.map(f=>{
          const w = f.type==="file" ? Math.max(18, Math.min(100, (f.size||0)/45421*100 * (Xv/32.29))) : 100;
          return <button key={f.name} onClick={()=>{setSel(f.name);}} onDoubleClick={()=>openFile(side,f)} className={`relative w-full grid grid-cols-[1fr_52px_64px_86px] px-2 py-1 text-left text-[11px] ${sel===f.name?"bg-[var(--gold)] text-black":"hover:bg-white/5"}`}>
            <span className="truncate flex items-center gap-1.5 relative z-10">{f.type==="dir"?<Folder size={13}/>:f.ext==="json"?<FileJson size={13}/>:f.ext==="tsx"||f.ext==="js"||f.ext==="css"?<FileCode size={13}/>:<File size={13}/>}{f.name}</span>
            <span className="relative z-10">{f.ext||"<DIR>"}</span><span className="text-right relative z-10">{f.type==="dir"?"<DIR>":f.size?.toLocaleString("de-DE")}</span><span className="text-right relative z-10 opacity-80">{f.date}</span>
            {sel===f.name && <span className="absolute left-0 bottom-0 h-[2px] bg-black/60" style={{width:`${w}%`}}/>}
          </button>})}
      </div>
      <div className="mt-auto px-2 py-1 text-[10px] text-[var(--muted)] border-t border-[var(--line)] flex justify-between"><span>{list.length} Objekt(e) · {total.toLocaleString("de-DE")} Bytes</span><span style={{color:gate?"#2eff6a":"#ff9500"}}>{gate?"● GATE OPEN":"○ GATE …"}</span></div>
      <div className="px-2 pb-2 flex gap-1 flex-wrap">
        <button onClick={()=>{const f=list.find(x=>x.name===sel); if(f) openFile(side,f);}} className="text-[10px] border border-[var(--gold)] text-[var(--gold)] px-2 py-1">Öffnen ↵</button>
        <button onClick={()=>setStatus(`Kopieren (F5): ${sel} → ${side==="L"?rightPath:leftPath} · move% ${movePct}% (Z)`)} className="text-[10px] border border-[var(--line)] px-2 py-1">Kopieren F5</button>
        <button onClick={()=>setStatus(`Verschieben (F6): ${sel} · ${movePct}% abgeschlossen (NUTZUNG Z)`)} className="text-[10px] border border-[var(--line)] px-2 py-1">Verschieben F6</button>
      </div>
    </section>;
  };

  const bottomBtns:[string,()=>void][]=[
    ["Hilfe",()=>setStatus("Hilfe: Doppelklick öffnet · Alt+Num zeigt Ordnerbaum · F3 Anzeigen · F5 Kopieren")],
    ["Aktualisieren (F2)",()=>{setTick(t=>t+1); setStatus("Aktualisiert · "+new Date().toLocaleTimeString("de-DE"))}],
    ["Anzeigen (F3)",()=>setViewer("file")],["Bearbeiten (F4)",()=>setViewer("manifest")],
    ["Kopieren (F5)",()=>setStatus(`Kopiert: ${active==="L"?selL:selR} · move% ${movePct}%`)],
    ["Verschieben (F6)",()=>setStatus(`Verschoben: ${active==="L"?selL:selR} · ${movePct}%`)],
    ["Ordner erstellen (F7)",()=>setStatus("Neuer Ordner: .clippy/neu-"+tick+" (simuliert in apfel.narr)")],
    ["Löschen (F8)",()=>setStatus(`Gelöscht (Simulation): ${active==="L"?selL:selR} — kein echter Löschvorgang`)],
    ["Alle anzeigen",()=>setHidden({})],["Ordner verbergen",()=>setHidden(h=>({...h,"":true}))],
    ["Ausführbare verbergen",()=>setHidden(h=>({...h,html:true}))],["DLLs verbergen",()=>setHidden(h=>({...h,css:true}))],
    ["Toggle Auswahl",()=>setStatus("Auswahl umgekehrt: "+(active==="L"?selL:selR))],
    ["Register HKCU",()=>setStatus("HKCU\\Software\\cycOS\\TRI-AXIS · X="+Xv+" Y="+Yv+" Z="+Zv)],
    ["Playlist abspielen",()=>setStatus("▶ Playlist: VESTA HERDFEUER · CO2→ICE→H2O→LIFE→FIRE")],
    ["Editor",()=>setViewer("manifest")],["Alle wählen",()=>setStatus("Alle Objekte gewählt (beide Panes)")],
    ["MP3s auswählen",()=>setStatus("0 MP3s in apfel.narr gefunden")],["Bilddateien auswählen",()=>setStatus("Bilddateien: Zone-Minimal-FINAL.html Vorschau aktiv")],
    ["Auswahl merken",()=>setStatus("Auswahl gemerkt: "+(active==="L"?selL:selR))],
    ["Fehlende auswählen",()=>setStatus("Fehlende: keine — drChain [81,27,3,0] vollständig")],
    ["Doppelte auswählen",()=>setStatus("Doppelte: vfs-manifest.json in 0\\.clippy + 9\\.clippy")],
    ["Task-Manager",()=>setStatus(`Task-Manager: cycOS lauf · Ω ${omega.toFixed(1)} · GOOD ${GOOD.toFixed(2)}`)],
    ["Rechner",()=>setStatus(`Rechner: Ω = X·Y·Z = ${Xv}·${Yv}·${Zv} = ${omega.toFixed(3)}`)],
    ["Computerverwaltung",()=>setStatus("Ventoy USB: 7 GB frei · H: apfel.narr · FAT/exFAT bereit")],
    ["Wizard Mode",()=>{setShowGit(v=>!v); setStatus("Wizard Mode: Git-Baum "+(showGit?"aus":"an"))}],
  ];

  return <div data-safe-area-inset-root style={{boxSizing:'border-box',paddingTop:'var(--safe-area-inset-top)'}} className="min-h-screen bg-[var(--bg)] relative">
    {/* Canvas background */}
    <div className="relative h-[300px] md:h-[360px] border-b border-[var(--line)] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>
      <div className="absolute top-2 left-2 bg-black/70 border border-[var(--gold)] px-3 py-2 max-w-[92vw]">
        <div className="text-[var(--gold)] font-bold text-sm tracking-widest">cycOS · FOTO-PROGRAMMIERER · TRI-AXIS SYMBIOSE</div>
        <div className="text-[10px] text-[var(--muted)]">WURZEL 0⊃3⊃9⊃27⊃81⊃243⊃729→730 FREI · Q9=19683 · <span className="text-[#2eff6a]">VESTA HERDFEUER IMMER AN</span></div>
        <div className="text-[10px] mt-1">FORM <span style={{color:"#ff3b30"}}>X={Xv.toFixed(2)}</span> · ENERGIE <span style={{color:"#2eff6a"}}>Y={Yv.toFixed(2)}</span> · NUTZUNG <span style={{color:"#ff9500"}}>Z={Zv.toFixed(3)}</span> · R={R} · GOOD {GOOD.toFixed(2)} · Ω={omega.toFixed(3)} · CO₂ {co2.toFixed(0)} ppm</div>
        <div className={`text-[11px] font-bold ${gate?"text-[#2eff6a]":"text-[#ff9500]"}`}>{gate?"⬢ GATE OPEN":"⬢ GATE GESCHLOSSEN"} · aura={aura.toFixed(3)} {gate?"(≥0.7)":"(<0.7 — Y/Z erhöhen)"} · move% {movePct}%</div>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 border border-[var(--line)] px-2 py-1 text-[9px]">MERKUR · VENUS · ERDE · MARS · JUPITER · SATURN · URANUS · NEPTUN</div>
    </div>

    {/* Top bar like Multi Commander */}
    <header data-safe-area-sticky-top style={{top:'var(--safe-area-inset-top)'}} className="sticky z-20 bg-[#0a121e] border-b border-[var(--gold)]">
      <nav className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-1.5 text-[12px]">{["Datei","Bearbeiten","Ansicht","Einstellungen","Erweiterungen","Extras","Hilfe"].map(m=><button key={m} onClick={()=>setStatus(`Menü ${m}: Multi Commander v1.16 (x64) → cycOS Lauf`)} className="hover:text-[var(--gold)] underline-offset-4 hover:underline">{m}</button>)}</nav>
      <div className="flex flex-wrap items-center gap-1 px-3 pb-1.5">{["C","D","E","F","G","H","I","J"].map(d=><button key={d} onClick={()=>{if(d==="H"){setLeftPath(PATHS[0]);setStatus("Laufwerk H: Ventoy USB · 7 GB frei · apfel.narr");}else setStatus(`Laufwerk ${d}: nicht eingehängt — H: ist aktiv`);}} className={`w-7 h-7 text-[11px] font-bold border ${d==="H"?"bg-[var(--gold)] text-black border-[var(--gold)]":"border-[var(--line)] hover:border-[var(--gold)]"}`}>{d}</button>)}
        <span className="text-[10px] text-[var(--muted)] ml-2">Multi Commander (x64) v1.16 · cycOS TRI-AXIS Lauf · {savedEdits.length} Manifest-Save(s)</span></div>
      <div className="px-3 py-1 bg-[var(--gold)] text-black text-[11px] font-bold">ⓘ mit Alt+Num wird Ordnerbaum angezeigt &nbsp;·&nbsp; {status}</div>
    </header>

    <main className="px-2 md:px-3 py-3 max-w-[1500px] mx-auto">
      {/* TRI-AXIS controls */}
      <section className="grid md:grid-cols-3 gap-2 mb-3">
        {[{label:"FORM X — beeinflusst Balkenbreite der Dateigrößen",val:Xv,set:setXv,min:5,max:60,step:0.01,col:"#ff3b30"},{label:"ENERGIE Y — beeinflusst CO₂→ICE→H₂O→LIFE→FIRE",val:Yv,set:setYv,min:1,max:20,step:0.01,col:"#2eff6a"},{label:"NUTZUNG Z — beeinflusst move% (F5/F6)",val:Zv,set:setZv,min:0.05,max:1,step:0.001,col:"#ff9500"}].map(s=>(
          <label key={s.label} className="bg-[var(--surface)] border border-[var(--line)] p-3 block">
            <span className="text-[11px] font-bold" style={{color:s.col}}>{s.label}</span>
            <span className="float-right font-bold">{s.val}</span>
            <input type="range" min={s.min} max={s.max} step={s.step} value={s.val} onChange={e=>s.set(+e.target.value)} className="w-full mt-2 accent-[#ffd700]"/>
            <span className="text-[10px] text-[var(--muted)]">Live: Ω={omega.toFixed(2)} · GOOD {GOOD.toFixed(2)} · aura {aura.toFixed(3)}</span>
          </label>))}
      </section>

      {/* Two-pane file manager */}
      <div className="flex flex-col lg:flex-row gap-2">
        <Pane side="L" path={leftPath} setPath={setLeftPath} sel={selL} setSel={setSelL}/>
        <Pane side="R" path={rightPath} setPath={setRightPath} sel={selR} setSel={setSelR}/>
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-1">Tipp: Doppelklick auf <b className="text-[var(--gold)]">vfs-manifest.json</b> öffnet den VFS-Viewer · Doppelklick auf Git-Dateien öffnet den .git-Viewer · FORM X skaliert die Größen-Balken live.</p>

      {/* Viewer */}
      {viewer==="manifest" && <section className="mt-3 bg-[var(--surface)] border border-[var(--gold)] p-3">
        <div className="flex items-center gap-2 flex-wrap"><FileJson className="text-[var(--gold)]" size={16}/><h2 className="font-bold text-[var(--gold)] text-sm">.clippy\vfs-manifest.json — VFS-Viewer (editierbar)</h2>
        <button onClick={saveManifest} className="ml-auto flex items-center gap-1 bg-[var(--gold)] text-black text-[11px] font-bold px-3 py-1.5"><Save size={13}/> Speichern (records)</button>
        <button onClick={()=>setManifest(MANIFEST_DEFAULT)} className="text-[11px] border border-[var(--line)] px-2 py-1.5">Original</button>
        <button onClick={()=>setViewer(null)} className="p-1 border border-[var(--line)]"><X size={14}/></button></div>
        <textarea value={manifest} onChange={e=>setManifest(e.target.value)} rows={12} className="w-full mt-2 bg-black/70 border border-[var(--line)] p-2 text-[11px] leading-relaxed outline-none focus:border-[var(--gold)]"/>
        <p className="text-[10px] text-[var(--muted)] mt-1">{savedEdits.length} gespeicherte Version(en) via records.list geladen · letzte: {savedEdits.length?String(savedEdits[savedEdits.length-1].value?.savedAt||"—"):"noch keine (Original aus Screenshot)"}</p>
      </section>}

      {viewer==="file" && <section className="mt-3 bg-[var(--surface)] border border-[var(--line)] p-3 flex items-start gap-3">
        <Eye className="text-[var(--gold)] shrink-0" size={18}/><div className="text-[12px]"><b className="text-[var(--gold)]">{active==="L"?selL:selR}</b> — Vorschau (F3): Datei aus H:\hh\apfel.narr · Symbiose-Lauf Ω={omega.toFixed(3)} · GOOD {GOOD.toFixed(2)} · {gate?"GATE OPEN":"GATE …"}<div className="text-[var(--muted)] text-[11px] mt-1">Inhalt wird foto-programmiert aus den Screenshots rekonstruiert; echte Bytes liegen auf dem Ventoy-USB (7 GB frei).</div></div>
        <button onClick={()=>setViewer(null)} className="ml-auto p-1 border border-[var(--line)]"><X size={14}/></button></section>}

      {/* Git viewer */}
      {(showGit||viewer==="git") && <section className="mt-3 bg-[var(--surface)] border border-[var(--line)] p-3">
        <h2 className="font-bold text-[var(--gold)] text-sm flex items-center gap-2"><GitBranch size={15}/> .git-Viewer — objects / hooks / logs</h2>
        <div className="grid md:grid-cols-3 gap-3 mt-2 text-[11px]">
          <div><div className="text-[var(--muted)] mb-1">objects\ ({gitObjs.length} Ordner)</div><div className="flex flex-wrap gap-1">{gitObjs.map(o=><button key={o} onClick={()=>{setRightPath(o==="0f"?PATHS[3]:o==="1a"?PATHS[4]:PATHS[2]); setStatus(`.git\\objects\\${o}\\ geöffnet (Pane rechts)`);}} className="border border-[var(--line)] px-1.5 py-0.5 hover:border-[var(--gold)] hover:text-[var(--gold)]">{o}</button>)}</div>
          <p className="mt-2 text-[var(--muted)]">0f\: 740698… (55 B) · cb0815… (438 B)<br/>1a\: c8c31d… (186 B)</p></div>
          <div><div className="text-[var(--muted)] mb-1">hooks\ ({HOOKS.length})</div><ul className="space-y-0.5 max-h-[130px] overflow-y-auto">{HOOKS.map(h=><li key={h}>· {h}</li>)}</ul></div>
          <div><div className="text-[var(--muted)] mb-1">logs\refs\heads\</div><p>main — 184 B · Heute 21:40<br/><span className="text-[var(--muted)]">0000000 → c8c31d4 commit (initial): apfel.narr TRI-AXIS<br/>info\exclude — 240 B</span></p>
          <button onClick={()=>{setRightPath(PATHS[5]); setStatus("logs\\refs\\heads\\main in Pane rechts");}} className="mt-2 border border-[var(--gold)] text-[var(--gold)] px-2 py-1">logs öffnen →</button></div>
        </div></section>}

      {/* Bottom toolbar */}
      <section className="mt-3 bg-[var(--surface)] border border-[var(--line)] p-2">
        <div className="flex flex-wrap gap-1">{bottomBtns.map(([l,fn])=><button key={l} onClick={fn} className="text-[10px] border border-[var(--line)] px-2 py-1.5 hover:border-[var(--gold)] hover:text-[var(--gold)]">{l}</button>)}
          {["C:\\","D:\\","E:\\","F:\\","G:\\"].map(d=><button key={d} onClick={()=>setStatus(`Laufwerk ${d} — nur H: (Ventoy) eingehängt`)} className="text-[10px] border border-[var(--line)] px-2 py-1.5">{d}</button>)}</div>
      </section>

      <section className="mt-3 grid md:grid-cols-2 gap-2 text-[11px]">
        <div className="bg-[var(--surface)] border border-[var(--line)] p-3"><h3 className="text-[var(--gold)] font-bold flex items-center gap-1"><Activity size={13}/> Symbiose-Lauf (live)</h3>
          <p className="mt-1 leading-relaxed">WURZEL 0⊃3⊃9⊃27⊃81⊃243⊃729→730 FREI · Q9=19683<br/>Ω = X·Y·Z = <b>{omega.toFixed(3)}</b> · R={R} · GOOD={GOOD.toFixed(2)} · aura={aura.toFixed(3)} → <b style={{color:gate?"#2eff6a":"#ff9500"}}>{gate?"GATE OPEN":"GATE GESCHLOSSEN"}</b><br/>CO₂ {co2.toFixed(0)} ppm → ICE → H₂O → LIFE → FIRE → CO₂ (ENERGIE Y treibt den Kreislauf, NUTZUNG Z = move% {movePct}%)</p></div>
        <div className="bg-[var(--surface)] border border-[var(--line)] p-3"><h3 className="text-[var(--gold)] font-bold flex items-center gap-1"><Sun size={13}/> window.FOTO API</h3>
          <p className="mt-1 text-[var(--muted)]">Öffentlich im Browser: <code className="text-[var(--gold)]">window.FOTO.apfel.narr</code> · <code className="text-[var(--gold)]">window.FOTO.TRI</code> · <code className="text-[var(--gold)]">window.FOTO.WURZEL</code> — wird bei jedem Slider-Schritt aktualisiert.</p></div>
      </section>
    </main>

    {/* Windows taskbar */}
    <footer className="sticky bottom-0 z-20 bg-[#0a0f16]/95 backdrop-blur border-t border-[var(--line)] flex items-center gap-2 px-3 py-1.5 text-[11px]">
      <span className="bg-[var(--gold)] text-black font-bold px-2 py-0.5">⊞ Start</span>
      <span className="border border-[var(--line)] px-2 py-0.5">🌐 Microsoft Edge</span>
      <span className="border border-[var(--gold)] text-[var(--gold)] px-2 py-0.5">📁 Datei-Explorer — apfel.narr</span>
      <span className="border border-[var(--line)] px-2 py-0.5 hidden sm:inline">Multi Commander</span>
      <span className="ml-auto text-right leading-tight">23:22<br/><span className="text-[var(--muted)]">27.10.2026</span></span>
    </footer>
  </div>;
}
