import { useEffect, useRef, useState, useCallback } from 'react';
import './index.css';

/* ════════════════════════════════════════════════════════════════════
   WURZEL · WEG B · RESONANZ BUS · V124 EHRICH
   Ein Bus, zwei Senken: ui()-Senke + RES-Senke (getrennt).
   RES wird aus echten boost()-Werten berechnet — nicht gesetzt.
   ════════════════════════════════════════════════════════════════════ */

/* ── RESONANZ: messbar, nicht behauptet ──
   Kopplungs-Resonanz = 1/(1+Varianz) über rollendes Fenster der boost()-Werte.
   1.0 = drei Rechner schwingen gleich, 0.0 = chaotisch getrennt. */
const RES = (() => {
  const hist: number[] = [];
  const WIN = 60;          // ~1s bei 60fps
  let value = 0;
  let samples = 0;
  return {
    push(b: number) {
      hist.push(b);
      if (hist.length > WIN) hist.shift();
      samples++;
      if (hist.length < 10) { value = 0; return value; }
      const mean = hist.reduce((a, x) => a + x, 0) / hist.length;
      const variance = hist.reduce((a, x) => a + (x - mean) ** 2, 0) / hist.length;
      value = 1 / (1 + variance * 100);   // *100: Varianz 0..1 → 0..100 Skala
      return value;
    },
    get() { return value; },
    meta() { return { value: +value.toFixed(3), samples, window: WIN, variance: +(hist.length ? hist.reduce((a, x) => a + (x - hist.reduce((p, q) => p + q, 0) / hist.length) ** 2, 0) / hist.length : 0).toFixed(4) }; }
  };
})();

/* ── CTRL-Bus: simple pubsub. fire diff assigns to S, calls listeners. ── */
type Diff = Record<string, unknown>;
type Listener = (d: Diff) => void;

interface SState {
  h: number; b: number; t: number; tore: number;
  dr: number;
  links: boolean[];
  veh: string;
  fps: number;
  eco: Record<string, number>;
}

const ECO0: Record<string, number> = { E: 123, CO2: 306, H2O: 111, O2: 99, N2: 60, C: 30 }; // Σ = 729

function boostOf(s: SState) { return s.links.filter(Boolean).length / 3; }

function derive(s: SState) {
  const boost = boostOf(s);
  const vol = s.h * s.b * s.t * 64;
  const aura = Math.min(1, s.h / 3 + boost * 0.1);
  const mana = Math.min(1, s.b / 3 + boost * 0.1);
  const zen = Math.min(1, s.t / 3 + boost * 0.05);
  const move = Math.min(1, s.tore / 3 + boost * 0.2);
  const gate = aura >= 0.7 && mana >= 0.7 && zen >= 0.9 && move >= 0.7 && s.fps >= 60;
  const corners = s.dr === 0 ? 1 : s.dr;
  return { vol, aura, mana, zen, move, gate, corners, boost };
}

/* Atem ehrlich: 16s-Zyklus EIN(4s) HALT(4s) AUS(4s) LEER(4s) */
function getAtemPhase(nowMs: number) {
  const cyc = (nowMs / 1000) % 16;
  if (cyc < 4) return { name: 'EIN', p: cyc / 4, amp: cyc / 4 };
  if (cyc < 8) return { name: 'HALT', p: (cyc - 4) / 4, amp: 1 };
  if (cyc < 12) return { name: 'AUS', p: (cyc - 8) / 4, amp: 1 - (cyc - 8) / 4 };
  return { name: 'LEER', p: (cyc - 12) / 4, amp: 0 };
}

interface Snap {
  h: number; b: number; t: number; tore: number; dr: number;
  links: boolean[]; veh: string; fps: number;
  eco: Record<string, number>; sum: number;
  vol: number; aura: number; mana: number; zen: number; move: number;
  gate: boolean; corners: number; boost: number;
  res: number; atem: string; atemP: number;
}

export default function App() {
  const S = useRef<SState>({
    h: 2.4, b: 2.4, t: 2.85, tore: 2.1,
    dr: 27, links: [false, false, false], veh: 'BUS', fps: 0,
    eco: { ...ECO0 },
  });

  const [snap, setSnap] = useState<Snap>(() => {
    const d = derive(S.current);
    return { ...S.current, sum: 729, ...d, res: 0, atem: 'EIN', atemP: 0 };
  });
  const [logs, setLogs] = useState<string[]>([
    'WURZEL V124 EHRICH · Weg B aktiv — ein Bus, zwei Senken, null Mog',
    'RES-Senke hört nur auf {resonance} · ui-Senke rendert den Rest',
  ]);
  const [blockedKey, setBlockedKey] = useState<string | null>(null);
  const [exportText, setExportText] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resRef = useRef<HTMLSpanElement>(null);
  const gateRef = useRef<boolean>(false);
  const exportRef = useRef<HTMLTextAreaElement>(null);

  const log = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString('de-DE', { hour12: false });
    setLogs(prev => [`${ts} ${msg}`, ...prev].slice(0, 30));
  }, []);

  /* ── ui(): die erste Senke. Rendert alles AUSSER resonance. ── */
  const ui = useCallback(() => {
    const s = S.current;
    const d = derive(s);
    const atem = getAtemPhase(performance.now());
    if (d.gate !== gateRef.current) {
      gateRef.current = d.gate;
      log(d.gate ? '✓ GATE OFFEN — alle Schwellen ehrlich erreicht' : '⛔ GATE ZU — Schwelle gerissen (kein Auto-Boost)');
    }
    setSnap({
      h: s.h, b: s.b, t: s.t, tore: s.tore, dr: s.dr, links: [...s.links],
      veh: s.veh, fps: s.fps, eco: { ...s.eco },
      sum: Object.values(s.eco).reduce((a, x) => a + x, 0),
      ...d, res: RES.get(), atem: atem.name, atemP: atem.p,
    });
  }, [log]);

  /* ── CTRL-Bus Instanz (ein Bus) ── */
  const CTRL = useRef<{ listeners: Listener[]; on: (f: Listener) => void; set: (k: string, v: unknown) => void } | null>(null);
  if (!CTRL.current) {
    const listeners: Listener[] = [];
    CTRL.current = {
      listeners,
      on(fn: Listener) { listeners.push(fn); },
      set(k: string, v: unknown) {
        (S.current as unknown as Record<string, unknown>)[k] = v;
        const d: Diff = { [k]: v };
        listeners.forEach(f => f(d));
      },
    };
  }

  /* ── Zwei Senken am selben Bus ── */
  useEffect(() => {
    const bus = CTRL.current!;
    /* Senke 1: ui() — alles außer resonance */
    bus.on((d) => { if ('resonance' in d) return; ui(); });
    /* Senke 2: RESONANZ-SENKE — eigener Listener, nur für Resonanz. Nicht in ui() gemischt. */
    bus.on((d) => {
      if (!('resonance' in d)) return;
      const el = resRef.current;
      if (!el) return;
      const v = d.resonance as number;
      el.textContent = `RES ${v.toFixed(3)}`;
      el.style.color = v >= 0.8 ? 'var(--g)' : v >= 0.4 ? 'var(--gold)' : '#f55';
      el.title = 'Kopplungs-Resonanz · 1/(1+Varianz) · Fenster 60 Frames';
    });
    (window as unknown as Record<string, unknown>).WURZEL_RES = RES;
    ui();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Frame-Loop: RAF · messeFPS ehrlich (EMA) · RES.push(boost()) · derive · morph · eco ── */
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let emaMs = 16.7;
    let _t0 = performance.now();
    const cv = canvasRef.current;
    const ctx = cv ? cv.getContext('2d') : null;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      const dt = now - last; last = now;
      /* messeFPS ehrlich: EMA der echten Frame-Dauer, kein hartcodierter Wert */
      if (dt > 0 && dt < 250) emaMs = emaMs * 0.95 + dt * 0.05;
      S.current.fps = 1000 / emaMs;

      const d = derive(S.current);
      RES.push(boostOf(S.current));   // ← nach derive: echte boost()-Werte einspeisen

      /* morph render */
      if (cv && ctx) {
        if (cv.width !== cv.clientWidth) { cv.width = cv.clientWidth; cv.height = 240; }
        const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
        ctx.clearRect(0, 0, W, H);
        const atem = getAtemPhase(now);
        const res = RES.get();
        const n = Math.max(3, Math.min(81, d.corners));
        const base = 26 + (d.vol / 1728) * 62;
        const rot = now / 4000;
        /* RES-Ring */
        ctx.beginPath();
        ctx.arc(cx, cy, base + 16, 0, Math.PI * 2);
        ctx.strokeStyle = res >= 0.8 ? 'rgba(53,208,127,.55)' : res >= 0.4 ? 'rgba(230,172,30,.55)' : 'rgba(255,85,85,.4)';
        ctx.lineWidth = 1.5; ctx.stroke();
        /* Morph-Polygon: Ecken = dr (0→1), Radius atmet ehrlich mit */
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const a = rot + (i / n) * Math.PI * 2;
          const wob = Math.sin(now / 700 + i * 0.7) * 7 * atem.amp + Math.sin(now / 230 + i) * 2;
          const r = base + wob;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = d.gate ? 'rgba(53,208,127,.13)' : 'rgba(230,172,30,.10)';
        ctx.fill();
        ctx.strokeStyle = d.gate ? '#35d07f' : '#e6ac1e';
        ctx.lineWidth = 2; ctx.stroke();
        /* 3 Rechner-Knoten */
        S.current.links.forEach((on, i) => {
          const a = -Math.PI / 2 + i * (Math.PI * 2 / 3) + rot * 0.4;
          const x = cx + Math.cos(a) * (base + 34), y = cy + Math.sin(a) * (base + 34);
          ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = on ? '#35d07f' : '#3a4753'; ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
          ctx.strokeStyle = on ? 'rgba(53,208,127,.5)' : 'rgba(90,110,126,.25)';
          ctx.lineWidth = 1; ctx.stroke();
        });
        ctx.fillStyle = '#5a6e7e';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(`vol ${Math.round(d.vol)} · ecken ${d.corners} · atem ${atem.name}`, 8, H - 8);
      }

      /* einmal pro Sekunde: Bus feuern (fps + resonance) + ui() */
      if (now - _t0 >= 1000) {
        _t0 = now;
        CTRL.current!.set('resonance', +RES.get().toFixed(3));   // ← Bus-Patch
        ui();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ui]);

  const set = (k: string, v: unknown) => CTRL.current!.set(k, v);

  /* ── Zone: Übergang nur wenn Gate ehrlich offen — sonst verweigert + Block-Feedback ── */
  const zoneGo = (g: 'I' | 'M' | 'A', key: string) => {
    const d = derive(S.current);
    if (!d.gate) {
      setBlockedKey(key);
      setTimeout(() => setBlockedKey(null), 900);
      log('⛔ Gate zu — Übergang verweigert (ehrlich, kein Auto-Boost). aura/mana/zen/move/fps prüfen.');
      return;
    }
    const w = { M: 27, A: 81, I: 3 }[g];
    set('dr', w);
    log(`✓ übertreten → Dr=${w} (${g === 'M' ? 'MITTE' : g === 'A' ? 'AUSSEN' : 'INNEN'}) — Gate war ehrlich offen`);
  };

  const ecoShift = (from: string, to: string, amt: number, label: string) => {
    const eco = { ...S.current.eco };
    if (eco[from] < amt) { log(`⚠ ${label}: ${from} zu leer (${eco[from]}) — ehrlich verweigert`); return; }
    eco[from] -= amt; eco[to] += amt;
    set('eco', eco);
    log(`${label}: ${from} −${amt} → ${to} +${amt} · Σ bleibt ${Object.values(eco).reduce((a, x) => a + x, 0)}`);
  };

  const toggleLink = (i: number) => {
    const links = [...S.current.links];
    links[i] = !links[i];
    set('links', links);
    log(`Rechner ${i + 1} ${links[i] ? 'verbunden' : 'getrennt'} · boost=${(links.filter(Boolean).length / 3).toFixed(3)}`);
  };

  /* ── Export: o.resonance = RES.meta() — nachprüfbar (variance + samples) ── */
  const doExport = () => {
    const s = S.current;
    const d = derive(s);
    const o: Record<string, unknown> = {
      app: 'WURZEL WEG B RESONANZ BUS', version: 'V124 EHRICH',
      timestamp: new Date().toISOString(),
      state: { h: s.h, b: s.b, t: s.t, tore: s.tore, dr: s.dr, veh: s.veh, links: s.links, fps: +s.fps.toFixed(1) },
      derived: { vol: Math.round(d.vol), aura: +d.aura.toFixed(3), mana: +d.mana.toFixed(3), zen: +d.zen.toFixed(3), move: +d.move.toFixed(3), boost: +d.boost.toFixed(3), gate: d.gate, corners: d.corners },
      economy: { ...s.eco, sum: Object.values(s.eco).reduce((a, x) => a + x, 0) },
      atem: getAtemPhase(performance.now()).name + ' · 16s-Zyklus EIN/HALT/AUS/LEER',
    };
    o.resonance = RES.meta();   // {value, samples, window, variance}
    setExportText(JSON.stringify(o, null, 2));
    setCopyMsg('');
    log(`EXPORT erzeugt · resonance=${JSON.stringify(o.resonance)}`);
  };

  const doCopy = () => {
    const ta = exportRef.current;
    if (!ta) return;
    ta.select();
    document.execCommand('copy');
    setCopyMsg('✓ Export in Zwischenablage kopiert');
  };

  const sliders: { k: 'h' | 'b' | 't' | 'tore'; label: string; base: string; boostNote: string }[] = [
    { k: 'h', label: 'HÖHE', base: 'aura = h/3', boostNote: '+ boost·0.10' },
    { k: 'b', label: 'BREITE', base: 'mana = b/3', boostNote: '+ boost·0.10' },
    { k: 't', label: 'TIEFE', base: 'zen = t/3', boostNote: '+ boost·0.05' },
    { k: 'tore', label: 'TORE', base: 'move = tore/3', boostNote: '+ boost·0.20' },
  ];

  const axes: [string, string][] = [
    ['AURA', snap.aura.toFixed(2)], ['MANA', snap.mana.toFixed(2)], ['ZEN', snap.zen.toFixed(2)],
    ['MOVE', snap.move.toFixed(2)], ['FPS', String(Math.round(snap.fps))], ['VOL', String(Math.round(snap.vol))],
    ['DR', String(snap.dr)], ['BOOST', snap.boost.toFixed(2)], ['RES', snap.res.toFixed(3)],
    ['GATE', snap.gate ? 'OFFEN' : 'ZU'], ['ATEM', snap.atem], ['Σ ECO', String(snap.sum)],
  ];

  const zoneCells = Array.from({ length: 27 }, (_, i) => {
    const g = i < 9 ? 'I' : i < 18 ? 'M' : 'A';
    return { key: `z${i}`, g: g as 'I' | 'M' | 'A', n: i + 1 };
  });

  const shellStyle = { boxSizing: 'border-box', paddingTop: 'var(--safe-area-inset-top)' } as const;

  return (
    <div data-safe-area-inset-root style={shellStyle} className="min-h-[100dvh] bg-[var(--bg)] text-[var(--ink)] overflow-x-clip">
      {/* ── Header ── */}
      <header data-safe-area-sticky-top style={{ top: 'var(--safe-area-inset-top)' }} className="sticky z-20 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <h1 className="text-base sm:text-xl font-bold tracking-tight">WURZEL · WEG B · RESONANZ BUS · 81→27→3→0 <span className="text-[var(--gold)]">EHRICH</span></h1>
          <p className="mono text-[10px] sm:text-[11px] text-[var(--mut)] mt-0.5">ein Bus zwei Senken null Mog · RES = 1/(1+Varianz) über boost() Fenster 60 · V124</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 grid gap-5 lg:grid-cols-2">
        {/* ═══ LINKS ═══ */}
        <section className="space-y-5 min-w-0">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10px] tracking-widest text-[var(--mut)]">CANVAS MORPH · ATEM {snap.atem} {(snap.atemP * 100).toFixed(0)}%</span>
              <span className="mono text-[10px]" style={{ color: snap.gate ? 'var(--g)' : '#f55' }}>{snap.gate ? '● GATE OFFEN' : '● GATE ZU'}</span>
            </div>
            <canvas ref={canvasRef} className="w-full block rounded" style={{ height: 240 }} />
            <div className="mono text-[9px] text-[var(--mut)] mt-1">Atem ehrlich 16s: EIN 4s · HALT 4s · AUS 4s · LEER 4s — treibt nur die Morph-Amplitude</div>
          </div>

          {/* Dr buttons */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">DR · DIMENSION</div>
            <div className="flex flex-wrap gap-2">
              {[0, 3, 27, 81].map(v => (
                <button key={v} onClick={() => { set('dr', v); log(`Dr → ${v} · Ecken=${v === 0 ? 1 : v}`); }}
                  className={`mono px-4 py-2 rounded border text-sm font-bold ${snap.dr === v ? 'bg-[var(--gold)] text-black border-[var(--gold)]' : 'border-[var(--line)] hover:border-[var(--gold)]'}`}>
                  Dr {v}
                </button>
              ))}
              <span className="mono text-[10px] text-[var(--mut)] self-center">Ecken = dr===0 ? 1 : dr → aktuell {snap.corners}</span>
            </div>
          </div>

          {/* GPU economy eco grid */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10px] tracking-widest text-[var(--mut)]">GPU ECONOMY · ECO GRID</span>
              <span className="mono text-[11px] font-bold" style={{ color: snap.sum === 729 ? 'var(--g)' : '#f55' }}>Σ {snap.sum} / 729</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(snap.eco).map(([k, v]) => (
                <div key={k} className="bg-[var(--surface2)] border border-[var(--line)] rounded p-2 text-center">
                  <div className="mono text-[9px] text-[var(--mut)]">{k}</div>
                  <div className="mono text-lg font-bold">{v}</div>
                  <div className="h-1 mt-1 rounded bg-[var(--line)] overflow-hidden"><div className="h-full bg-[var(--gold)]" style={{ width: `${Math.min(100, (v / 306) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => ecoShift('CO2', 'E', 9, '❄ VEREISEN')} className="mono text-[11px] px-3 py-1.5 rounded border border-[var(--line)] hover:border-[var(--gold)]">❄ vereisen</button>
              <button onClick={() => ecoShift('O2', 'H2O', 9, '💧 VERWÄSSERN')} className="mono text-[11px] px-3 py-1.5 rounded border border-[var(--line)] hover:border-[var(--gold)]">💧 verwässern</button>
              <button onClick={() => ecoShift('C', 'E', 9, '🔥 ZÜNDEN')} className="mono text-[11px] px-3 py-1.5 rounded border border-[var(--line)] hover:border-[var(--gold)]">🔥 zünden</button>
            </div>
            <div className="mono text-[9px] text-[var(--mut)] mt-2">Transfers erhalten Σ=729 — nichts wird erzeugt oder vernichtet.</div>
          </div>

          {/* 12 Achsen chips */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">12 ACHSEN</div>
            <div className="flex flex-wrap gap-1.5">
              {axes.map(([k, v]) => (
                <span key={k} className="mono text-[10px] px-2 py-1 rounded bg-[var(--surface2)] border border-[var(--line)]">{k} <b>{v}</b></span>
              ))}
            </div>
          </div>

          {/* Log */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">LOG</div>
            <div className="mono text-[10px] leading-relaxed space-y-0.5 max-h-44 overflow-y-auto">
              {logs.map((l, i) => <div key={i} className={i === 0 ? '' : 'text-[var(--mut)]'}>{l}</div>)}
            </div>
          </div>
        </section>

        {/* ═══ RECHTS ═══ */}
        <section className="space-y-5 min-w-0">
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-3">HÖHE · BREITE · TIEFE · TORE <span className="normal-case tracking-normal">(Slider transparent: Basis + Boost-Anteil getrennt ausgewiesen)</span></div>
            {sliders.map(s => {
              const boostAdd = s.k === 'h' || s.k === 'b' ? snap.boost * 0.1 : s.k === 't' ? snap.boost * 0.05 : snap.boost * 0.2;
              return (
                <div key={s.k} className="mb-3">
                  <div className="flex justify-between mono text-[11px]">
                    <span className="font-bold">{s.label}</span>
                    <span className="text-[var(--mut)]">{s.base} = {(snap[s.k] / 3).toFixed(2)} <span style={{ color: 'var(--g)' }}>{s.boostNote} = +{boostAdd.toFixed(2)}</span> → <b className="text-[var(--ink)]">{Math.min(1, snap[s.k] / 3 + boostAdd).toFixed(2)}</b></span>
                  </div>
                  <input type="range" min={0} max={3} step={0.01} value={snap[s.k]} onChange={e => set(s.k, parseFloat(e.target.value))} aria-label={s.label} />
                </div>
              );
            })}

            {/* Gate + RES-Anzeige (Gate-Bereich) */}
            <div className={`rounded border p-2 mt-2 ${snap.gate ? 'border-[var(--g)]' : 'border-[var(--red)] gate-closed-pulse'}`}>
              <div className="mono text-[12px] font-bold" style={{ color: snap.gate ? 'var(--g)' : '#f55' }}>
                {snap.gate ? '✓ GATE OFFEN' : '⛔ GATE ZU'} <span className="text-[var(--mut)] font-normal text-[10px]">aura≥0.7 · mana≥0.7 · zen≥0.9 · move≥0.7 · fps≥60</span>
              </div>
              <div className="mono text-[10px] text-[var(--mut)]">
                aura {snap.aura.toFixed(2)} · mana {snap.mana.toFixed(2)} · zen {snap.zen.toFixed(2)} · move {snap.move.toFixed(2)} · fps {Math.round(snap.fps)} (EMA ehrlich gemessen)
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#5a6e7e', margin: '2px 0' }} className="mono">
              <span ref={resRef} style={{ fontWeight: 700 }}>RES 0.000</span>
              <span style={{ color: '#5a6e7e' }}> · Kopplungs-Resonanz (Bus-Signal, getrennt von ui)</span>
            </div>

            {/* veh buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {['FUSS', 'RAD', 'BUS', 'BAHN'].map(v => (
                <button key={v} onClick={() => { set('veh', v); log(`Vehikel → ${v}`); }}
                  className={`mono text-[11px] px-3 py-1.5 rounded border ${snap.veh === v ? 'bg-[var(--gold)] text-black border-[var(--gold)] font-bold' : 'border-[var(--line)] hover:border-[var(--gold)]'}`}>{v}</button>
              ))}
            </div>
          </div>

          {/* ZONE 27 */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">ZONE 27 · Übergang nur bei offenem Gate — sonst ehrliche Verweigerung</div>
            <div className="grid grid-cols-9 gap-1">
              {zoneCells.map(c => (
                <button key={c.key} onClick={() => zoneGo(c.g, c.key)}
                  className={`mono text-[9px] py-1.5 rounded border ${blockedKey === c.key ? 'blocked-pulse border-[var(--red)] text-[var(--red)]' : !snap.gate ? 'border-[var(--line)] opacity-60' : 'border-[var(--line)] hover:border-[var(--gold)]'} ${snap.dr === (c.g === 'I' ? 3 : c.g === 'M' ? 27 : 81) ? 'bg-[var(--surface2)] font-bold' : ''}`}>
                  {c.g}{c.n}
                </button>
              ))}
            </div>
            <div className="mono text-[9px] text-[var(--mut)] mt-2">I1–I9 → Dr 3 (INNEN) · M10–M18 → Dr 27 (MITTE) · A19–A27 → Dr 81 (AUSSEN). Gate zu = Felder gedimmt, Klick pulsiert rot — kein Auto-Boost, kein Durchmogel.</div>
          </div>

          {/* CONNECT 3 RECHNER */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">CONNECT · 3 RECHNER · boost = links/3</div>
            <div className="flex flex-wrap gap-2">
              {snap.links.map((on, i) => (
                <button key={i} onClick={() => toggleLink(i)}
                  className={`mono text-[11px] px-3 py-2 rounded border ${on ? 'border-[var(--g)] text-[var(--g)] font-bold' : 'border-[var(--line)] text-[var(--mut)]'}`}>
                  {on ? '●' : '○'} RECHNER {i + 1}
                </button>
              ))}
              <span className="mono text-[11px] self-center">boost = <b>{snap.boost.toFixed(3)}</b> · RES = <b>{snap.res.toFixed(3)}</b></span>
            </div>
            <div className="mono text-[9px] text-[var(--mut)] mt-2 leading-relaxed">
              Test-Kriterium: links=[0,0,0] → boost konstant 0 → Varianz 0 → RES = 1.000 (stabil getrennt). links schnell togglen → Varianz hoch → RES fällt gegen 0. links=[1,1,1] konstant → RES = 1.000. samples &lt; 10 → RES = 0 (ehrlich: noch nicht messbar).
            </div>
          </div>

          {/* EXPORT */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">EXPORT · manifest.resonance = RES.meta() {'{value, samples, window, variance}'}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={doExport} className="mono text-[11px] px-4 py-2 rounded bg-[var(--gold)] text-black font-bold">EXPORT JSON ERZEUGEN</button>
              {exportText && <button onClick={doCopy} className="mono text-[11px] px-3 py-2 rounded border border-[var(--line)] hover:border-[var(--gold)]">KOPIEREN</button>}
            </div>
            {copyMsg && <div className="mono text-[10px] mt-2" style={{ color: 'var(--g)' }}>{copyMsg}</div>}
            {exportText && (
              <textarea ref={exportRef} readOnly value={exportText} rows={14}
                className="mono text-[10px] w-full mt-3 rounded bg-[var(--surface2)] border border-[var(--line)] p-2" />
            )}
          </div>

          {/* Struktur-Nachweis */}
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-lg p-3">
            <div className="mono text-[10px] tracking-widest text-[var(--mut)] mb-2">STRUKTUR · VORHER / NACHHER</div>
            <div className="mono text-[10px] leading-relaxed space-y-1">
              <div><span className="text-[var(--mut)]">Vorher:</span> ein Bus, eine Senke (ui) · Gate nur binär · Export ohne Resonanz-Nachweis</div>
              <div><span style={{ color: 'var(--g)' }}>Nachher (Weg B):</span> ein Bus, zwei Senken (ui + RES-Senke) · Gate plus kontinuierliche Kopplungs-Resonanz · manifest.resonance mit variance + samples — nachprüfbar</div>
              <div className="text-[var(--mut)]">RES.get() wird aus echten boost()-Werten berechnet, nicht gesetzt. Zwei Senken am selben Bus = kein versteckter zweiter State.</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-6">
        <div className="mono text-[9px] text-[var(--mut)]">WURZEL V124 EHRICH · FPS per EMA ehrlich gemessen (nie hartcodiert) · Zone verweigert ehrlich ohne Auto-Repair · Atem 16s EIN/HALT/AUS/LEER · Slider zeigen Basis + Boost getrennt · Σ Economy = 729 konstant</div>
      </footer>
    </div>
  );
}
