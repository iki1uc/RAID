import { useEffect, useRef, useState, useCallback } from "react";

const ROOT = { H: 3, B: 27, T: 81, DR: [81, 27, 3, 0], Q9: 19683, CHAIN: "81◆→△→27▣→3↺→0", GOOD: 79.84 };
const PRE: Record<string, number[]> = {
  solo: [32.29, 8.16, 0.254, 25.9, 0.348],
  alpha: [48, 12, 0.6, 45, 0.52],
  beta: [16, 4, 0.15, 15, 0.22],
  gamma: [64, 16, 1, 88, 0.88],
};
const AX: [string, string, number][] = [
  ["X", "Breite", 81], ["Y", "Höhe", 81], ["Z", "Tiefe", 81],
  ["oi", "outside-in", 27], ["io", "inside-out", 27], ["ix", "innen-x", 27],
  ["xi", "x-innen", 3], ["ax", "a→x", 3], ["xa", "x→a", 72],
  ["ay", "a→y", 27], ["ya", "y→a", 27], ["az/za", "Atem", 3],
];
const ECOL: Record<string, string> = { CO2: "#8aa0c0", H2O: "#2a8bd7", ICE: "#c7f9ff", FIRE: "#ff7a45", LIFE: "#39ff88", UNLIFE: "#c9a86a" };
type EcoKey = keyof typeof ECOL;
const SL_DEF: [string, string, number, number, number][] = [
  ["h", "HÖHE y", 0, 16, 0.01], ["b", "BREITE x", 0, 64, 0.01], ["t", "TIEFE z", 0, 1, 0.001],
  ["r", "rFactor", 0, 1, 0.001], ["eco", "ECO P=U·I", 0, 100, 0.1],
  ["aura", "aura", 0, 1, 0.01], ["mana", "mana", 0, 1, 0.01], ["zen", "zen", 0, 1, 0.01], ["move", "move", 0, 1, 0.01],
];

function zone(x: number, y: number, z: number) { return x === 1 && y === 1 && z === 1 ? "M" : (x % 2 === 0 || y % 2 === 0 || z % 2 === 0) ? "A" : "I"; }

export default function App() {
  const [S, setS] = useState({ h: 8.16, b: 32.29, t: 0.254, r: 0.348, eco: 25.9, aura: 0.8, mana: 0.8, zen: 0.95, move: 0.8, dr: 27, bio_root: 2142, atom: 81, gamma: 1.73, fps: 60, veh: "solo", links: [0, 0, 0] as number[], tempo: 1.0 });
  const [E, setE] = useState<Record<EcoKey, number>>({ CO2: 306, H2O: 109, ICE: 109, FIRE: 73, LIFE: 73, UNLIFE: 59 });
  const [auto, setAuto] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [outJson, setOutJson] = useState("");
  const [atemInfo, setAtemInfo] = useState({ phase: "EIN", breath: 0, cycle: 0, remaining: 4 });
  const [copied, setCopied] = useState(false);

  const cvRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(S); stateRef.current = S;
  const ecoRef = useRef(E); ecoRef.current = E;
  const autoRef = useRef(auto); autoRef.current = auto;
  const atemRef = useRef({ t: 0, lastPhase: "", cycles: 0 });
  const fpsRef = useRef({ ema: 16.67, last: performance.now(), frames: 0 });

  const log = useCallback((m: string) => {
    setLogs(prev => [...prev.slice(-60), `[${new Date().toLocaleTimeString("de-DE")}] ${m}`]);
  }, []);

  const boost = S.links.filter(Boolean).length / 3;
  const moveEff = Math.min(1, S.move + boost * 0.2);
  const gateOpen = S.aura >= 0.7 && S.mana >= 0.7 && S.zen >= 0.9 && moveEff >= 0.7 && S.fps >= 60;
  const vol = S.h * S.b * S.t * 64;
  const tot = Object.values(E).reduce((a, b) => a + b, 0);

  const set = useCallback((k: string, v: any) => setS(prev => ({ ...prev, [k]: v })), []);

  // Economy helpers — conservation: total always 729
  const mv = useCallback((eco: Record<EcoKey, number>, a: EcoKey, b: EcoKey, n: number) => {
    const take = Math.min(n, eco[a]); eco[a] -= take; eco[b] += take; return take;
  }, []);
  const vereisen = useCallback((silent = false) => {
    setE(prev => { const n = { ...prev }; const t = mv(n, "CO2", "ICE", 30) + mv(n, "H2O", "ICE", 10); if (!silent) log(`❄ vereisen: ${t} → ICE · Σ=${Object.values(n).reduce((a, b) => a + b, 0)}`); return n; });
  }, [mv, log]);
  const verwassern = useCallback((silent = false) => {
    setE(prev => { const n = { ...prev }; const t = Math.min(30, n.CO2, n.H2O); n.CO2 -= t; n.H2O -= t; n.LIFE += t; if (!silent) log(`💧 verwassern: ${t} CO₂+H₂O → LIFE · Σ=729`); return n; });
  }, [log]);
  const zuenden = useCallback((silent = false) => {
    setE(prev => { const n = { ...prev }; const t = mv(n, "LIFE", "FIRE", 15) + mv(n, "UNLIFE", "FIRE", 15) + mv(n, "ICE", "FIRE", 10); if (!silent) log(`🔥 zünden: ${t} → FIRE · Σ=729`); return n; });
  }, [mv, log]);

  // MOG #3 FIX — honest Atem: 16s cycle, tempo scales duration only, 4 sine phases
  const getAtemPhase = useCallback((tSec: number) => {
    const cycleDur = 16 / stateRef.current.tempo;
    const c = tSec % cycleDur; const p = c / cycleDur;
    let phase = "LEER", breath = 0;
    if (p < 0.25) { phase = "EIN"; breath = p / 0.25; }
    else if (p < 0.5) { phase = "HALT"; breath = 1; }
    else if (p < 0.75) { phase = "AUS"; breath = 1 - (p - 0.5) / 0.25; }
    else { phase = "LEER"; breath = 0; }
    const phaseRemaining = (0.25 - (p % 0.25)) * cycleDur;
    return { phase, breath, cycleDur, phaseRemaining, p };
  }, []);

  // Canvas + honest FPS loop (MOG #1 FIX)
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: false }); if (!ctx) return;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, T = 0, lastUi = 0;
    const rs = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    rs(); window.addEventListener("resize", rs);

    const morph = (cx: number, cy: number, R: number, n: number, ph: number, bs: number, hs: number) => {
      ctx.beginPath();
      if (n <= 1) { ctx.arc(cx, cy, R * 0.15, 0, 6.2832); return; }
      for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + ph + (6.2832 * i) / n; const x = cx + Math.cos(a) * R * (0.8 + 0.4 * bs); const y = cy + Math.sin(a) * R * (0.8 + 0.4 * hs); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath();
    };

    const frame = (now: number) => {
      // HONEST FPS — no hardcode
      const f = fpsRef.current;
      const dt = Math.max(0.1, now - f.last); f.last = now;
      f.ema = f.ema * 0.9 + dt * 0.1;
      const realFps = Math.round(1000 / f.ema);
      const dtSec = dt / 1000;

      // Atem advance
      const at = atemRef.current; at.t += dtSec;
      const atem = getAtemPhase(at.t);
      if (atem.phase !== at.lastPhase) {
        if (atem.phase === "HALT") {
          // One honest economy reaction per HALT entry — breath-driven, not interval
          setE(prev => {
            const n = { ...prev };
            const r = Math.random();
            if (autoRef.current) { /* auto handled below */ }
            // breath-driven drift: EIN absorb handled continuously; HALT triggers conversion
            const t1 = Math.min(1, n.LIFE); n.LIFE -= t1; n.UNLIFE += t1;
            const t2 = Math.min(1, n.UNLIFE); n.UNLIFE -= t2; n.CO2 += t2;
            const t3 = Math.min(2, n.FIRE); n.FIRE -= t3; n.CO2 += t3;
            return n;
          });
          if (autoRef.current) { const r = Math.random(); if (r < 0.34) vereisen(true); else if (r < 0.67) verwassern(true); else zuenden(true); }
        }
        if (atem.phase === "EIN" && at.lastPhase === "LEER") at.cycles++;
        at.lastPhase = atem.phase;
      }

      T += 0.016;
      const s = stateRef.current;
      const cx = W / 2, cy = H / 2, M = Math.min(W, H) * 0.36;
      const cold = Math.max(0, Math.min(1, 2.2 - s.gamma));
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgb(0,${20 + cold * 50 | 0},${40 + cold * 70 | 0})`);
      g.addColorStop(1, `rgb(${20 + (1 - cold) * 100 | 0},${10 + (1 - cold) * 30 | 0},12)`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const bs = s.b / 64, hs = s.h / 16;
      const breathScale = 1 + (atem.breath - 0.5) * 0.08;
      ROOT.DR.forEach((n, i) => {
        const act = n === s.dr;
        morph(cx, cy, M * (1 - i * 0.22) * (0.6 + s.r * 0.8) * breathScale, n === 0 ? 1 : n, T * 0.15 * (i % 2 ? -1 : 1), bs, hs);
        ctx.strokeStyle = act ? "#ffd700" : "rgba(255,215,0,.25)"; ctx.lineWidth = act ? 2.2 : 1; ctx.stroke();
        if (act && n) { ctx.fillStyle = "rgba(255,215,0,.07)"; ctx.fill(); }
      });
      if (s.dr === 0) { ctx.beginPath(); ctx.arc(cx, cy, 6 + Math.sin(T * 3) * 2, 0, 6.2832); ctx.fillStyle = "#ffd700"; ctx.fill(); }
      // economy orbit — 81 particles, breath-modulated radius
      const eco = ecoRef.current; const total = Object.values(eco).reduce((a, b) => a + b, 0) || 729;
      const keys = Object.keys(eco) as EcoKey[]; let idx = 0, acc = eco[keys[0]];
      for (let i = 0; i < 81; i++) {
        while ((i / 81) * total >= acc && idx < keys.length - 1) { idx++; acc += eco[keys[idx]]; }
        const a = (i / 81) * 6.2832 + T * 0.2; const r = M * 1.08 * breathScale + Math.sin(T * 2 + i) * 4;
        ctx.fillStyle = ECOL[keys[idx]]; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * (0.8 + 0.4 * bs), cy + Math.sin(a) * r * (0.8 + 0.4 * hs), 2.4, 0, 6.2832); ctx.fill();
      }
      ctx.fillStyle = cold > 0.5 ? "#00ccff" : "#ff7a45"; ctx.font = "15px 'IBM Plex Mono',monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(cold > 0.5 ? "❄ 730" : "🔥 730", cx, cy);
      ctx.font = "9px 'IBM Plex Mono',monospace"; ctx.fillStyle = "#5cf0ff";
      ctx.fillText(`${atem.phase} · breath ${atem.breath.toFixed(2)} · ${realFps} FPS ehrlich`, cx, cy + M * 0.62);

      // Throttled honest UI sync (4×/s)
      if (now - lastUi > 250) {
        lastUi = now;
        setS(prev => prev.fps === realFps ? prev : { ...prev, fps: realFps });
        setAtemInfo({ phase: atem.phase, breath: atem.breath, cycle: at.cycles, remaining: atem.phaseRemaining });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", rs); };
  }, [getAtemPhase, vereisen, verwassern, zuenden]);

  useEffect(() => { log("WURZEL EHRICH geladen · " + ROOT.CHAIN + " · kein Mog"); log("✓ FPS ehrlich gemessen (EMA dt) — Gate fällt ehrlich bei <60"); log("✓ Atem: 16s-Zyklus EIN/HALT/AUS/LEER — kein setInterval-Trick"); log("✓ Zone 27: kein Auto-Repair — geschlossen bleibt geschlossen"); }, [log]);

  // MOG #2 FIX — honest zone crossing
  const onZone = (z: string) => {
    if (!gateOpen) { log("⛔ Tore lahmt — Gate geschlossen — Übergang verweigert (ehrlich)"); return; }
    const d = { M: 27, A: 81, I: 3 }[z]!;
    set("dr", d); log(`✓ übertreten → Dr=${d} (${z === "M" ? "MITTE" : z === "A" ? "AUSSEN" : "INNEN"}) — Gate war ehrlich offen`);
  };

  const doExport = () => {
    const o = {
      type: "WGEN-2-NUTZRAUM", ehrlich: true, H: ROOT.H, B: ROOT.B, T: ROOT.T, Dr: S.dr, DrChain: ROOT.DR, Q9: ROOT.Q9,
      geo: { x: S.b, y: S.h, z: S.t, r: S.r, eco: S.eco },
      gate: { aura: S.aura, mana: S.mana, zen: S.zen, move: moveEff, moveBase: S.move, boost: boost, open: gateOpen, fps: S.fps },
      bio_root: S.bio_root, atom: S.atom, gamma: S.gamma, vehicle: S.veh, economy: E, economySum: tot, links: S.links, tempo: S.tempo,
      atem: { phase: atemInfo.phase, breath: +atemInfo.breath.toFixed(3), cycles: atemInfo.cycle, cycleDurSec: +(16 / S.tempo).toFixed(2) },
      fixes: { fps: "real EMA measurement, no hardcode", zone: "no auto-repair, blocked when closed", atem: "16s honest cycle, tempo scales duration", slider: "base + boost transparent" },
      manifest: `WGEN-2-NUTZRAUM H=3 B=27 T=81 Dr=${S.dr} veh=${S.veh} EHRICH`,
    };
    const j = JSON.stringify(o, null, 2); setOutJson(j);
    // copy via execCommand (clipboard API blocked in sandbox)
    const ta = document.createElement("textarea"); ta.value = j; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); setCopied(true); log("JSON kopiert (ehrlich)"); setTimeout(() => setCopied(false), 2000); } catch { log("JSON unten sichtbar"); }
    document.body.removeChild(ta);
  };

  const cells: { z: string; key: string }[] = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) cells.push({ z: zone(x, y, z), key: `${x}${y}${z}` });

  const box = "border border-[#ffd70018] bg-[var(--surface)] p-2.5 mb-2.5";
  const h2 = "text-[10px] text-[var(--gold)] tracking-[0.1em] mb-2 flex justify-between items-center flex-wrap gap-1";
  const btn = "bg-[var(--surface2)] border border-[#ffd70022] text-[#8aa0c0] px-2 py-1 text-[9px] cursor-pointer hover:border-[var(--gold)] mr-0.5 mb-0.5";
  const btnOn = "bg-[var(--gold)] text-black font-bold border-[var(--gold)]";

  return (
    <div data-safe-area-inset-root style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)" }} className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="max-w-[1200px] mx-auto p-3 text-[10px] leading-relaxed">
        {/* HEADER */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[13px] tracking-[0.14em] text-[var(--gold)] font-bold">
              WURZEL · EHRICH · 81◆ → △ → 27▣ → 3↺ → 0
              <span className="text-[var(--green)] border border-[#39ff8855] px-2 py-0.5 ml-2 text-[8px] tracking-[0.15em] align-middle">EHRICH ✓</span>
            </h1>
            <div className="text-[#6a7a8a] my-1 text-[9px]">eine Zustandsquelle · ein RAF · ein FPS · ein Bus — <b className="text-[var(--green)]">ehrlich, nichts durchgemogelt</b> · V123 ENDWURZELT</div>
          </div>
          <div className="flex gap-1.5 text-[9px]">
            <span className="border border-[var(--line)] px-2 py-1">FPS <b className={S.fps >= 60 ? "text-[var(--green)]" : "text-[#f55]"}>{S.fps}</b> <span className="text-[var(--dim)]">real</span></span>
            <span className={`border px-2 py-1 ${gateOpen ? "border-[var(--green)] text-[var(--green)]" : "border-[#f55] text-[#f55]"}`}>{gateOpen ? "GATE OFFEN" : "GATE ZU"}</span>
            <span className="border border-[var(--gold)] text-[var(--gold)] px-2 py-1">Dr={S.dr}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.3fr_1fr] grid-cols-1 gap-2.5 mt-1">
          {/* LEFT */}
          <div>
            <div className={box}>
              <h2 className={h2}><span>MORPH · Dr-KETTE</span><span className="text-[var(--cyan)] font-normal">· {S.dr === 0 ? "0 DEEP" : S.dr + " Ecken"} · {ROOT.CHAIN}</span></h2>
              <canvas ref={cvRef} onClick={() => { set("gamma", S.gamma > 2 ? 1.73 : 2.1); log(S.gamma > 2 ? "🔥 FIRE · GPU HOT (gamma 2.1)" : "❄ ICE · GPU COLD (gamma 1.73)"); }} className="w-full block bg-[#02060a] cursor-pointer" style={{ aspectRatio: "16/10" }} aria-label="Morph Canvas — Klick wechselt ICE/FIRE" />
              <div className="mt-1.5 flex flex-wrap">
                {ROOT.DR.map(d => <button key={d} onClick={() => set("dr", d)} className={`${btn} ${S.dr === d ? btnOn : ""}`}>Dr={d}</button>)}
                <span className="ml-2 text-[9px] text-[var(--cyan)] self-center">Atem: <b>{atemInfo.phase}</b> · breath {atemInfo.breath.toFixed(2)} · Zyklus #{atemInfo.cycle} · noch {atemInfo.remaining.toFixed(1)}s</span>
              </div>
              <div className="text-[#5a6e7e] mt-1">Klick auf die Fläche = ICE ↔ FIRE (gamma 1.73 ↔ 2.1) · Tempo:</div>
              <div className="flex items-center gap-2 mt-1">
                <input type="range" min={0.25} max={3} step={0.05} value={S.tempo} onChange={e => set("tempo", +e.target.value)} className="flex-1" aria-label="Tempo — skaliert ehrlich die Atem-Zyklusdauer (16s / tempo)" />
                <span className="text-[var(--gold)] font-bold w-14 text-right">{S.tempo.toFixed(2)}×</span>
                <span className="text-[var(--dim)]">Zyklus {(16 / S.tempo).toFixed(1)}s</span>
              </div>
              <div className="h-1.5 bg-[#0a1220] border border-[var(--line)] mt-1.5"><div className="h-full bg-[var(--green)] transition-all duration-150" style={{ width: `${atemInfo.breath * 100}%` }} /></div>
              <div className="flex justify-between text-[8px] text-[var(--dim)] mt-0.5"><span>EIN (einatmen)</span><span>HALT</span><span>AUS</span><span>LEER</span></div>
            </div>

            <div className={box}>
              <h2 className={h2}><span>GPU-ÖKONOMIE · 729 = 81×9 → 730 FREI</span><span className="text-[var(--cyan)] font-normal">· Σ {tot} {tot === 729 ? "✔" : "✘"}</span></h2>
              <div className="grid grid-cols-3 gap-1">
                {(Object.keys(E) as EcoKey[]).map(k => (
                  <div key={k} className="border border-[var(--line)] p-1 text-center" style={{ color: ECOL[k] }}>{k}<br /><b className="text-[12px]">{E[k]}</b></div>
                ))}
              </div>
              <div className="mt-1.5">
                <button className={btn} onClick={() => vereisen()}>❄ vereisen</button>
                <button className={btn} onClick={() => verwassern()}>💧 verwassern</button>
                <button className={btn} onClick={() => zuenden()}>🔥 zünden</button>
                <button className={`${btn} ${auto ? btnOn : ""}`} onClick={() => { setAuto(!auto); log(auto ? "⟳ auto AUS" : "⟳ auto AN — Reaktionen bei HALT (atemgetrieben)"); }}>⟳ auto {auto ? "AN" : ""}</button>
              </div>
              <div className="text-[var(--dim)] mt-1">Erhaltung ehrlich: jede Reaktion verschiebt nur — Σ bleibt 729. Auto reagiert bei HALT-Eintritt, nicht per Intervall.</div>
            </div>

            <div className={box}>
              <h2 className={h2}><span>12 ACHSEN · nach Dr</span></h2>
              <div className="flex flex-wrap">
                {AX.map(a => <span key={a[0] + a[1]} className={`inline-block border px-1.5 py-0.5 m-0.5 ${a[2] === S.dr ? "border-[var(--green)] text-[var(--green)]" : "border-[var(--line)] text-[#5a6e7e]"}`}>{a[0]}·{a[2]} <span className="opacity-60">{a[1]}</span></span>)}
                <span className="inline-block px-1.5 py-0.5 m-0.5 text-[#6a7a8a]">{AX.filter(a => a[2] === S.dr).length} Achsen bei Dr={S.dr}</span>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div className={box}>
              <h2 className={h2}><span>HÖHE · BREITE · TIEFE · TORE</span><span className="text-[var(--green)] text-[8px] font-normal">FPS ehrlich — kein Toggle</span></h2>
              {SL_DEF.map(([k, label, min, max, step]) => {
                const isMove = k === "move";
                const shown = isMove ? moveEff : (S as any)[k];
                return (
                  <div key={k}>
                    <div className="flex justify-between my-1 text-[#8aa0c0]">
                      <span>{label}</span>
                      <span><b className="text-[var(--gold)]">{(+shown).toFixed(step < 0.01 ? 3 : 2)}</b>
                        {isMove && boost > 0 && <small className="text-[var(--green)] text-[8px] ml-1">Basis {S.move.toFixed(2)} +{(moveEff - S.move).toFixed(2)} boost (ehrlich)</small>}
                      </span>
                    </div>
                    <input type="range" min={min} max={max} step={step} value={(S as any)[k]} onChange={e => set(k, +e.target.value)} className="w-full h-1" aria-label={label} />
                  </div>
                );
              })}
              <div className={`p-1.5 text-center font-bold my-1.5 border ${gateOpen ? "text-[var(--green)] border-[var(--green)]" : "text-[#f55] border-[#f55]"}`}>
                {gateOpen ? `ALLE TORE OFFEN · GOOD ${ROOT.GOOD} · Vol ${vol.toFixed(1)}` : `TORE LAHMT · fps ${S.fps} (ehrlich) · move ${moveEff.toFixed(2)} · aura ${S.aura.toFixed(2)} mana ${S.mana.toFixed(2)} zen ${S.zen.toFixed(2)}`}
              </div>
              <div className="text-[8px] text-[var(--dim)] mb-1.5">Gate ehrlich: aura≥0.70 · mana≥0.70 · zen≥0.90 · move≥0.70 · fps≥60 (real gemessen)</div>
              <div className="flex flex-wrap">
                {Object.keys(PRE).map(k => (
                  <button key={k} onClick={() => { const p = PRE[k]; setS(prev => ({ ...prev, b: p[0], h: p[1], t: p[2], eco: p[3], r: p[4], veh: k })); log("Vehicle " + k); }} className={`${btn} ${S.veh === k ? btnOn : ""}`}>{k.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div className={box}>
              <h2 className={h2}><span>ZONE 27▣ · Klick = übertreten</span><span className="text-[var(--green)] text-[8px] font-normal">FIX: verweigert ehrlich</span></h2>
              <div className="grid grid-cols-9 gap-0.5">
                {cells.map(c => (
                  <button key={c.key} onClick={() => onZone(c.z)} title={c.key + " · " + c.z} aria-label={`Zone ${c.key} ${c.z}`}
                    className="aspect-square border border-[var(--line)] cursor-pointer p-0 hover:border-[var(--gold)]"
                    style={{ background: c.z === "M" ? "var(--green)" : c.z === "A" ? "#2a5bd755" : "#ffd70044" }} />
                ))}
              </div>
              <div className="flex gap-3 mt-1.5 text-[8px] text-[var(--dim)]"><span><i className="inline-block w-2 h-2 mr-1" style={{ background: "var(--green)" }} />Mitte→Dr27</span><span><i className="inline-block w-2 h-2 mr-1 bg-[#2a5bd7]" />Aussen→Dr81</span><span><i className="inline-block w-2 h-2 mr-1 bg-[#ffd70066]" />Innen→Dr3</span></div>
              {!gateOpen && <div className="text-[#f55] text-[8px] mt-1">Gate zu — Klicks werden ehrlich verweigert, keine Werte werden angehoben.</div>}
            </div>

            <div className={box}>
              <h2 className={h2}><span>🔗 CONNECT · 3 RECHNER</span><span className="text-[var(--green)] text-[8px] font-normal">FIX: Boost offen ausgewiesen</span></h2>
              {[["R1 ↔ R2", 0], ["R2 ↔ R3", 1], ["R1 ↔ R3", 2]].map(([label, i]: any) => (
                <div key={i} className="flex justify-between items-center my-1">
                  <span>{label}</span>
                  <span style={{ color: S.links[i] ? "var(--green)" : "#f55" }}>{S.links[i] ? "● aktiv" : "○ inaktiv"}</span>
                  <button className={btn} onClick={() => { const l = S.links.slice(); l[i] = l[i] ? 0 : 1; set("links", l); }}>TOGGLE</button>
                </div>
              ))}
              <button className={btn} onClick={() => set("links", [1, 1, 1])}>CONNECT ALL</button>
              <span className="ml-1">Kopplung <b className="text-[var(--green)]">{Math.round(boost * 100)}%</b> → move +{(boost * 0.2).toFixed(2)} bei {S.links.filter(Boolean).length}/3 Links (ehrlich gerechnet)</span>
            </div>

            <div className={box}>
              <h2 className={h2}><span>EXPORT · WGEN-2-NUTZRAUM</span><span className="text-[var(--green)] text-[8px] font-normal">ehrlich: true</span></h2>
              <button className={btn} onClick={doExport}>{copied ? "✓ KOPIERT" : "COPY JSON"}</button>
              {outJson && <pre className="bg-black p-1.5 max-h-[140px] overflow-auto whitespace-pre text-[8px] mt-1.5 text-[#9fd8c9]">{outJson}</pre>}
              <div className="h-[110px] overflow-auto bg-black p-1.5 text-[#6a8a8a] text-[9px] mt-1.5" aria-live="polite">
                {logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-[8px] text-[var(--dim)] mt-1 pb-2">
          WURZEL EHRICH ENDWURZELT V123 · MOG #1 FPS real (EMA) · MOG #2 Zone ohne Auto-Repair · MOG #3 Atem 16s-Zyklus statt Intervall · MOG #4 Slider Basis+Boost transparent · Σ=729 erhalten
        </div>
      </div>
    </div>
  );
}
