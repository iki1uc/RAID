import { useEffect, useMemo, useRef, useState, useCallback } from "react";

// ---------- WURZELMATIK ----------
const W = [3, 9, 81, 243, 756, 19683];
const OLD = [3, 9, 27, 81, 243, 729];
const wurzel = (n: number) => Math.log(n) / Math.log(3);
const hoch = (e: number) => Math.pow(3, e);
const MYSTERY = ((756 - 729) / 19683) * 1.618;
const LABELS: Record<number, string> = { 3: "WURZEL·IN", 9: "QUADRAT·PI", 81: "FELD·S8", 243: "RAUM", 756: "OVERFLOW·TORE", 19683: "Q9·FREI" };

const DEFAULT_INI = `; V119 GEWURZELT CORE
[WURZEL]
chain = 3,9,81,243,756,19683
qi = 3
iq = 27
iqq = 756
overflow = 756
mystery = auto

[TRIAXIS]
ARG = 32.29
XARG = 0.254
ARG3TE = 8.16
ECO = 50
rFactor = 0.5
vehicle = SOLO

[DJINN]
aura = 79.84
good = 79.84
gate = auto
Dr = 81

[GPU]
ram.hdf.scsi.raid.sli.ready = true
stars = 185
`;

type Section = { name: string; keys: { k: string; v: string; line: number }[] };
function parseIni(text: string): Section[] {
  const out: Section[] = []; let cur: Section | null = null;
  text.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) return;
    const m = line.match(/^\[(.+)\]$/);
    if (m) { cur = { name: m[1], keys: [] }; out.push(cur); return; }
    const eq = line.indexOf("=");
    if (eq > 0 && cur) cur.keys.push({ k: line.slice(0, eq).trim(), v: line.slice(eq + 1).trim().replace(/^"|"$/g, ""), line: i + 1 });
  });
  return out;
}

const SLOTS = ["TERRAIN", "ROM", "FINDER", "BALL", "WETTER", "BIOTOPIA", "SLI", "RAID", "SCSI", "INI", "TRI", "DJINN", "WURZEL"];
const BIO_STATES = ["CO2", "ICE", "H2O", "LIFE", "UNLIFE", "FIRE"];

type Win = { id: string; title: string; x: number; y: number; z: number };

export default function App() {
  const [dr, setDr] = useState(81);
  const [mode, setMode] = useState<"SHINE" | "MIRROR" | "ORI">("SHINE");
  const [iniText, setIniText] = useState(DEFAULT_INI);
  const [arg, setArg] = useState(32.29);
  const [xarg, setXarg] = useState(0.254);
  const [arg3, setArg3] = useState(8.16);
  const [eco, setEco] = useState(50);
  const [rf, setRf] = useState(0.5);
  const [vehicle, setVehicle] = useState("SOLO");
  const [sliMode, setSliMode] = useState("BRIDGE");
  const [raidLevel, setRaidLevel] = useState(5);
  const [wins, setWins] = useState<Win[]>([]);
  const [zTop, setZTop] = useState(10);
  const [fps, setFps] = useState(60);
  const [tick, setTick] = useState(0);
  const [msg, setMsg] = useState("CORE READY · gpu.nergie=ram.hdf.scsi.raid.sli.ready");
  const [slotNames, setSlotNames] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ arg, xarg, arg3, mode, dr, t: 0 });
  stateRef.current = { arg, xarg, arg3, mode, dr, t: tick };

  const sections = useMemo(() => parseIni(iniText), [iniText]);
  const omega = arg * arg3 * xarg;
  const omegaN = Math.min(1, omega / 67);
  const good = 79.84;
  const gate = (omegaN >= 0.42 && fps >= 30 && good >= 79.84) || (756 / 19683 >= 0.038 && omegaN >= 0.0384);
  const movePct = Math.round(40 + omegaN * 55);
  const score = Math.round(omega * 12 + eco);

  const openWin = useCallback((s: string) => {
    setWins((w) => {
      if (w.find((x) => x.id === s)) return w.map((x) => x.id === s ? { ...x, z: zTop + 1 } : x);
      return [...w, { id: s, title: slotNames[s] || s, x: 60 + w.length * 24, y: 60 + w.length * 20, z: zTop + 1 }];
    });
    setZTop((z) => z + 1);
    setMsg(`WINDOW OPEN · ${s}`);
  }, [zTop, slotNames]);

  // single RAF canvas
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d", { desynchronized: true, alpha: false } as CanvasRenderingContext2DSettings);
    if (!ctx) return;
    let raf = 0; let last = performance.now(); let frames = 0; let ft = last;
    const stars = Array.from({ length: 185 }, (_, i) => ({ x: (i * 137.5) % 1, y: (i * 89.3) % 1, s: (i % 3) + 1 }));
    const loop = (now: number) => {
      frames++; if (now - ft >= 500) { setFps(Math.round(frames * 1000 / (now - ft))); frames = 0; ft = now; }
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { arg: A, xarg: X, arg3: E, mode: M } = stateRef.current;
      const t = now / 1000;
      ctx.fillStyle = "#02060a"; ctx.fillRect(0, 0, w, h);
      // stars
      ctx.fillStyle = "#3d5a8a";
      stars.forEach((s) => ctx.fillRect(s.x * w, s.y * h, s.s, s.s));
      const cx = w / 2, cy = h / 2;
      const om = A * E * X; const omN = Math.min(1, om / 67);
      // ghost old chain
      ctx.strokeStyle = "rgba(95,123,166,.35)"; ctx.fillStyle = "rgba(95,123,166,.6)"; ctx.font = "9px 'IBM Plex Mono'";
      OLD.forEach((n, i) => { const x = 40 + i * ((w - 80) / 5), y = h - 40 - wurzel(n) * 14; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.stroke(); ctx.fillText(String(n), x - 8, y + 16); });
      // new chain bright
      ctx.strokeStyle = "#ffd700"; ctx.fillStyle = "#ffd700";
      W.forEach((n, i) => {
        const x = 40 + i * ((w - 80) / 5), y = h - 40 - wurzel(n) * 14;
        if (i) { const px = 40 + (i - 1) * ((w - 80) / 5), py = h - 40 - wurzel(W[i - 1]) * 14; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(x, y, n === 756 ? 8 + Math.sin(t * 3) * 2 : 5, 0, 7); ctx.fill();
        ctx.fillText(`${n} ^${wurzel(n).toFixed(1)}`, x - 14, y - 12);
      });
      // TRI-AXIS cube wireframe
      const s = 34 + omN * 20; ctx.strokeStyle = M === "ORI" ? "#5f7ba6" : "#00ff88";
      const pts = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => {
        const rx = x * Math.cos(t * .4) - z * Math.sin(t * .4), rz = x * Math.sin(t * .4) + z * Math.cos(t * .4);
        return [cx + rx * s, cy - 90 + y * s * .7 + rz * 8] as const;
      });
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); ctx.stroke(); });
      if (M === "MIRROR") { ctx.save(); ctx.globalAlpha = .35; ctx.translate(0, (cy - 90) * 2); ctx.scale(1, -1); ctx.strokeStyle = "#2a5bd7"; [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(...pts[a]); ctx.lineTo(...pts[b]); ctx.stroke(); }); ctx.restore(); }
      // Omega sphere
      const R = 16 + omN * 42;
      const g = ctx.createRadialGradient(cx, cy + 60, 2, cx, cy + 60, R * 2);
      g.addColorStop(0, gate ? "rgba(0,255,136,.9)" : "rgba(255,215,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy + 60, R * (M === "SHINE" ? 1.6 : 1), 0, 7); ctx.fill();
      ctx.fillStyle = "#02060a"; ctx.font = "bold 13px 'IBM Plex Mono'"; ctx.fillText("Ω", cx - 5, cy + 65);
      // SLI pulses + RAID bars + SCSI grid mini
      for (let i = 0; i < 4; i++) { ctx.fillStyle = `hsl(${45 + i * 10},100%,${50 + Math.sin(t * 4 + i) * 20}%)`; ctx.fillRect(16, 16 + i * 12, 30 + Math.sin(t * 3 + i) * 10, 5); }
      for (let i = 0; i < 9; i++) { ctx.fillStyle = "#2a5bd7"; ctx.fillRect(w - 90 + i * 9, h - 90, 6, -((i * 37 + Math.floor(t * 9)) % 60) - 8); }
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) { ctx.fillStyle = (r * 9 + c) === ((27 % 81 + Math.floor(t)) % 81) ? "#ffd700" : "#12264a"; ctx.fillRect(w - 92 + c * 9, 14 + r * 9, 7, 7); }
      // BIO orbit
      BIO_STATES.forEach((b, i) => { const a = t * .3 + i * (Math.PI / 3); const x = cx + Math.cos(a) * 110, y = cy + 60 + Math.sin(a) * 26; ctx.fillStyle = i === 0 ? "#ffd700" : "#5f7ba6"; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.fillStyle = "#cfe3ff"; ctx.font = "8px 'IBM Plex Mono'"; ctx.fillText(b, x - 10, y - 9); });
      ctx.fillStyle = "#ffd700"; ctx.font = "10px 'IBM Plex Mono'";
      ctx.fillText(`Ω=${om.toFixed(2)} gate=${gate ? "OPEN" : "SHUT"} Dr=${stateRef.current.dr}`, 14, h - 12);
      last = now; raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onUnload = () => cancelAnimationFrame(raf);
    window.addEventListener("beforeunload", onUnload);
    const iv = setInterval(() => setTick((v) => v + 1), 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(iv); window.removeEventListener("beforeunload", onUnload); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dragWin = (id: string, e: React.PointerEvent) => {
    const startX = e.clientX, startY = e.clientY;
    const win = wins.find((x) => x.id === id); if (!win) return;
    const ox = win.x, oy = win.y;
    const mv = (ev: PointerEvent) => setWins((ws) => ws.map((x) => x.id === id ? { ...x, x: ox + ev.clientX - startX, y: oy + ev.clientY - startY, z: zTop + 1 } : x));
    const up = () => { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  };

  const applyDr = (v: number) => { setDr(v); setMsg(`PATCH Dr=${v} · chain broadcast · omega=${omega.toFixed(3)}`); };

  return (
    <div data-safe-area-inset-root style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)" }} className="min-h-screen w-full overflow-x-clip bg-[var(--bg)] text-[var(--ink)]">
      {/* HEADER */}
      <header data-safe-area-sticky-top style={{ top: "var(--safe-area-inset-top)" }} className="sticky z-40 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-sm font-bold tracking-widest text-[var(--gold)]">V119 · ALL GEWURZELT</span>
          <span className="hidden md:inline">3→9→81→243→<b className="text-[var(--gold)]">756</b>→19683 · gpu.nergie=ram.hdf.scsi.raid.sli.ready · Q9=19683 · QDF q0x51 81◆ d0x1B 27▣ f0x03 3↺</span>
          <span className="ml-auto">FPS <b className="text-[var(--ready)]">{fps}</b> · move {movePct}% · GATE <b style={{ color: gate ? "#00ff88" : "#ff5566" }}>{gate ? "OPEN" : "SHUT"}</b></span>
          {[81, 27, 3, 0].map((v) => <button key={v} className={`btn ${dr === v ? "on" : ""}`} onClick={() => applyDr(v)}>Dr {v}</button>)}
          <span>γ {(omegaN * 3).toFixed(2)} · SCORE <b className="text-[var(--gold)]">{score}</b> · Ω {omega.toFixed(2)}</span>
        </div>
        <div className="mt-1 text-[10px] text-[var(--dim)]">{msg} · mystery={MYSTERY.toFixed(5)} · 756=729+27=9³+27 · overflow tor aktiv</div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* TOOLATOR */}
        <nav className="flex lg:w-16 lg:flex-col flex-row flex-wrap gap-1 border-r border-[var(--line)] bg-[var(--panel)] p-2 text-[10px]">
          {["EICH", "GEN", "MARKE", "LAUF", "RESET", "DEFINE", "KLAUSUR"].map((t) => (
            <button key={t} className="btn" onClick={() => { if (t === "RESET") { setArg(32.29); setXarg(0.254); setArg3(8.16); setIniText(DEFAULT_INI); } setMsg(`TOOLATOR · ${t} ausgeführt`); }}>{t}</button>
          ))}
        </nav>

        {/* LEFT-MIDDLE */}
        <aside className="w-full lg:w-[300px] shrink-0 space-y-2 border-r border-[var(--line)] p-2">
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="text-[11px] font-bold tracking-widest text-[var(--gold)]">INI · SECTIONS ({sections.length})</h2>
            <ul className="mt-1 max-h-28 overflow-auto text-[11px]">
              {sections.map((s) => <li key={s.name} className="flex justify-between border-b border-[var(--line)] py-0.5"><span>[{s.name}]</span><span className="text-[var(--dim)]">{s.keys.length} keys</span></li>)}
            </ul>
            <textarea aria-label="INI Editor" className="mt-2 h-44 w-full rounded p-2 text-[11px]" value={iniText} onChange={(e) => { setIniText(e.target.value); setMsg("INI re-parse · hardware update · PATCH {Dr, omega}"); }} />
            <div className="text-[10px] text-[var(--dim)]">Zeilen live · ; comments · quotes ok · {iniText.split("\n").length} lines</div>
          </section>

          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2 text-[11px]">
            <h2 className="font-bold tracking-widest text-[var(--gold)]">EDITORIA</h2>
            <div className="mt-1 flex gap-1">{(["SHINE", "MIRROR", "ORI"] as const).map((m) => <button key={m} className={`btn ${mode === m ? "on" : ""}`} onClick={() => { setMode(m); setMsg(`EDITORIA · ${m}`); }}>{m}</button>)}</div>
            <h2 className="mt-3 font-bold tracking-widest text-[var(--gold)]">TRI-AXIS · Ω={omega.toFixed(3)}</h2>
            {([["ARG·FORM", arg, setArg, 0, 64, .01], ["XARG·NUTZUNG", xarg, setXarg, 0, 1, .001], ["ARG3TE·ENERGIE", arg3, setArg3, 0, 16, .01], ["ECO", eco, setEco, 0, 100, 1], ["rFactor", rf, setRf, 0, 1, .01]] as const).map(([label, val, set, min, max, step]) => (
              <label key={label} className="mt-1 block">{label} <b className="float-right text-[var(--gold)]">{Number(val).toFixed(3)}</b>
                <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))} /></label>
            ))}
            <div className="mt-1 flex gap-1">{["SOLO", "ALPHA", "BETA", "GAMMA"].map((v) => <button key={v} className={`btn ${vehicle === v ? "on" : ""}`} onClick={() => setVehicle(v)}>{v}</button>)}</div>
          </section>

          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2 text-[11px]">
            <h2 className="font-bold tracking-widest text-[var(--gold)]">WURZELMATIK 3·9·81·243·756</h2>
            {W.map((n) => <div key={n} className="flex justify-between border-b border-[var(--line)] py-0.5"><span>{n} = 3^{wurzel(n).toFixed(2)}</span><span className="text-[var(--dim)]">{LABELS[n]}</span></div>)}
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--dim)]">756 = 729+27 = 9³+27 · OVERFLOW TOR · mystery {MYSTERY.toFixed(5)} · qi=3 iq=27 iqq=756 · hoch(6)={hoch(6)} · zieh(756)={wurzel(756).toFixed(3)} · wurzel ziehend: 81 springt von 9 (27 übersprungen).</p>
          </section>
        </aside>

        {/* CENTER CANVAS */}
        <main className="relative min-w-0 flex-1 p-2">
          <div className="relative overflow-hidden rounded border border-[var(--line)] bg-black">
            <canvas ref={canvasRef} className="h-[52vh] w-full" aria-label="MAIN CANVAS all together visualization" />
          </div>
          <p className="mt-1 text-[10px] text-[var(--dim)]">MAIN CANVAS · Wurzelbaum (alt 27/729 ghost) · TRI-AXIS Cube X=FORM Y=ENERGIE Z=NUTZUNG · SLI pulse · RAID bars · SCSI 9×9 LUN={27 % 81} · BIOTOPIA orbit · P_stars 185 · DJINN bus live t={tick}s</p>

          {/* WINDOWS */}
          <div className="pointer-events-none absolute inset-2">
            {wins.map((win) => (
              <div key={win.id} className="win pointer-events-auto" style={{ left: win.x, top: win.y, zIndex: win.z, width: 250 }}>
                <div className="win-head" onPointerDown={(e) => dragWin(win.id, e)}><span>{win.title}</span>
                  <button className="btn" onClick={() => setWins((ws) => ws.filter((x) => x.id !== win.id))}>×</button></div>
                <div className="p-2 text-[11px]">
                  {win.id === "WURZEL" && <p>Kette {W.join(" → ")}<br />756 = 729 + 27 · Q9 = {hoch(9)}</p>}
                  {win.id === "RAM" && <div className="grid grid-cols-9 gap-0.5">{Array.from({ length: 81 }, (_, i) => <span key={i} className="h-3" style={{ background: i % 7 === 0 ? "#ffd700" : "#12264a" }} />)}</div>}
                  {win.id === "INI" && <p>{sections.length} Sections · {sections.reduce((a, s) => a + s.keys.length, 0)} Keys geparst.</p>}
                  {win.id === "BIOTOPIA" && <p>{BIO_STATES.join(" → ")} → CO2 · Sonne = 756 Overflow</p>}
                  {!["WURZEL", "RAM", "INI", "BIOTOPIA"].includes(win.id) && <p>{win.title} Modul aktiv · Ω {omega.toFixed(2)} · Dr {dr} · Mode {mode}. Minimalfenster — Kopf ziehen zum Bewegen.</p>}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* RIGHT PANELS */}
        <aside className="w-full lg:w-[290px] shrink-0 space-y-2 p-2 text-[11px]">
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="font-bold text-[var(--gold)]">SLI · Links 1–4 · VFPS {Math.round(fps * 1.8)}</h2>
            <div className="mt-1 flex gap-1">{["BRIDGE", "AFR", "SFR"].map((m) => <button key={m} className={`btn ${sliMode === m ? "on" : ""}`} onClick={() => setSliMode(m)}>{m}</button>)}</div>
            {[1, 2, 3, 4].map((i) => <div key={i} className="mt-1 h-2 rounded bg-[#12264a]"><div className="h-2 rounded bg-[var(--gold)] transition-all" style={{ width: `${45 + ((tick * 7 + i * 13) % 50)}%` }} /></div>)}
          </section>
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="font-bold text-[var(--gold)]">RAID · Level {raidLevel} · Drives 9 · Volumes 756 · Stripe 81</h2>
            <input type="range" min={0} max={10} value={raidLevel} onChange={(e) => setRaidLevel(Number(e.target.value))} aria-label="RAID Level" />
            {Array.from({ length: 9 }, (_, i) => <div key={i} className="mt-0.5 flex items-center gap-1"><span className="w-6">D{i}</span><div className="h-2 flex-1 rounded bg-[#12264a]"><div className="h-2 bg-[var(--ready)]" style={{ width: `${(756 / 9 + i * 3) % 100}%` }} /></div><span>{Math.round((756 / 9 + i * 3) % 100)}%</span></div>)}
            <p className="text-[10px] text-[var(--dim)]">Parity: 756 mod 9 = {756 % 9} · Volumes neu 756 (nicht 729)</p>
          </section>
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="font-bold text-[var(--gold)]">SCSI · Targets 81 · LUN 27 · Width 16 · Queue 243</h2>
            <div className="mt-1 grid grid-cols-9 gap-0.5">{Array.from({ length: 81 }, (_, i) => <span key={i} className="h-3 rounded-sm" style={{ background: i === (27 + tick) % 81 ? "#ffd700" : "#12264a" }} />)}</div>
            <p className="text-[10px] text-[var(--dim)]">active LUN = (27 + t) % 81 = {(27 + tick) % 81}</p>
          </section>
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="font-bold text-[var(--gold)]">UNI · S0–S4 · Ω_total {omega.toFixed(2)}</h2>
            <p>S0 fps/60 = {(fps / 60).toFixed(2)} · S1 {wurzel(9).toFixed(1)} · S2 {wurzel(81).toFixed(1)} · S3 {wurzel(243).toFixed(2)} · S4 {wurzel(756).toFixed(2)}</p>
          </section>
          <section className="rounded border border-[var(--line)] bg-[var(--panel)] p-2">
            <h2 className="font-bold text-[var(--gold)]">BIO · DJINN BUS</h2>
            <p>aura 79.84 · mana {(eco * .8).toFixed(1)} · zen {(rf * 100).toFixed(0)} · move {movePct}% · good 79.84</p>
            <p>canUebertreten: {gate ? "JA — Tor offen" : "NEIN"} · ampel {gate ? "🟢 GRÜN" : "🔴 ROT"} · GLOBAL_STATE {"{aura, Dr:"}{dr}{", omega, q9:19683, gate}"}</p>
            <button className="btn mt-1" onClick={() => openWin("RAM")}>RAM GRID 81</button>
          </section>
        </aside>
      </div>

      {/* BOTTOM DOCK */}
      <footer className="sticky bottom-0 z-30 border-t border-[var(--line)] bg-[var(--panel)] px-2 py-2">
        <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Dock Slots">
          {SLOTS.map((s) => (
            <button key={s} className="btn" title="Rechtsklick: umbenennen"
              onClick={() => openWin(s)}
              onContextMenu={(e) => { e.preventDefault(); const n = window.prompt ? "" : ""; const name = (document.getElementById("rename") as HTMLInputElement)?.value; void n; void name; setSlotNames((m) => ({ ...m, [s]: m[s] ? m[s] + "·" : s + "·X" })); setMsg(`Slot ${s} umbenannt (Toggle-Marke)`); }}>
              {slotNames[s] || s}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-[var(--dim)]">Manifest: WGEN-V119-GEWURZELT · chain [3,9,81,243,756,19683] · oldChain [3,9,27,81,243,729] · Q9 19683 · Dr 81→27→3→0 · good 79.84 · ram.hdf.scsi.raid.sli.ready=true · wurzel ziehend · overflow 756 · 1 RAF · DPR≤2 · Float32Array(9) · 0 alloc/frame</p>
      </footer>
    </div>
  );
}
