import { useEffect, useRef, useState } from "react";
import "./index.css";

/* ============================================================
   in.ni — Eye Brain Open Co-CPU — Feld Figur Funktion
   Minimal Real Core · file:///H:/hh/in.ni/index.html
   ============================================================ */

const REGISTERS = [
  { name: "LS_Index_Hub", value: "243", note: "3^5" },
  { name: "LS_Main_Kernel", value: "729", note: "3^6" },
  { name: "LS_City_Desert", value: "81", note: "3^4 · 9×9" },
  { name: "Q9", value: "19683", note: "3^9" },
];

const DR_CHAIN = ["81", "27", "3", "0"];
const WURZEL = ["3", "9", "81", "243", "756"];

const CPUS = [
  { id: "6600K", cores: "4C / 4T", clock: "3.50 GHz", boost: "3.90 GHz" },
  { id: "9600K", cores: "6C / 6T", clock: "3.70 GHz", boost: "4.60 GHz" },
  { id: "9600KF", cores: "6C / 6T", clock: "3.70 GHz", boost: "4.60 GHz" },
];

function SectionHead(props: { nr: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-[var(--line)] pb-2">
      <span className="text-[var(--good)] text-lg font-bold">{props.nr}</span>
      <h2 className="text-[var(--good)] tracking-[0.3em] text-sm sm:text-base font-bold uppercase">
        {props.title}
      </h2>
      <span className="text-[var(--ink-dim)] text-[10px] sm:text-xs tracking-widest uppercase truncate">
        {props.sub}
      </span>
    </div>
  );
}

export default function App() {
  /* Dr-Kette Schritt-Takt */
  const [chainStep, setChainStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setChainStep((s) => (s + 1) % DR_CHAIN.length), 900);
    return () => clearInterval(t);
  }, []);

  /* 9×9 Master Matrix */
  const [cells, setCells] = useState<boolean[]>(() => {
    const init = new Array(81).fill(false);
    // Startmuster: Diagonale + Mitte (Figur im Feld)
    for (let i = 0; i < 9; i++) {
      init[i * 9 + i] = true;
      init[i * 9 + (8 - i)] = true;
    }
    init[40] = true;
    return init;
  });
  const activeCount = cells.filter(Boolean).length;
  const toggleCell = (i: number) =>
    setCells((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  const clearMatrix = () => setCells(new Array(81).fill(false));
  const fillMatrix = () => setCells(new Array(81).fill(true));

  /* Co-CPU Auswahl */
  const [cpu, setCpu] = useState(CPUS[1]);

  /* Eye / Kamera */
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camState, setCamState] = useState<"idle" | "asking" | "live" | "blocked">("idle");
  const startCam = async () => {
    setCamState("asking");
    /* Playback-Versuch sofort auslösen, damit der Eingang sichtbar anspringt */
    if (videoRef.current) {
      videoRef.current.play().catch(() => undefined);
    }
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-md");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setCamState("live");
    } catch {
      setCamState("blocked");
    }
  };
  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamState("idle");
  };

  /* Funktion: Pumpe + Pipeline + Katapult */
  const [running, setRunning] = useState(true);
  const [shots, setShots] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setShots((s) => s + 1), 1500);
    return () => clearInterval(t);
  }, [running]);

  return (
    <div
      data-safe-area-inset-root
      className="mono min-h-screen bg-[var(--bg)] text-[var(--ink)] overflow-x-clip"
      style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)" }}
    >
      {/* ================= HEADER ================= */}
      <header
        data-safe-area-sticky-top
        className="sticky z-20 bg-[var(--bg)]/95 border-b-2 border-[var(--good)]"
        style={{ top: "var(--safe-area-inset-top)" }}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[var(--good)] font-bold text-xl tracking-widest">in.ni</span>
          <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[var(--ink)]">
            Eye Brain Open Co-CPU
          </span>
          <span className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-[var(--ink-dim)] hidden sm:inline">
            Feld · Figur · Funktion
          </span>
          <span className="ml-auto flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 bg-[var(--good)] blinkdot inline-block" />
            <span className="text-[var(--ink-dim)] tracking-widest">GOOD</span>
            <span className="text-[var(--good)] font-bold text-base">79.84</span>
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-5 py-6 space-y-10 pb-12">
        {/* ================= 01 FELD ================= */}
        <section aria-label="Feld Data Layer">
          <SectionHead nr="01" title="Feld" sub="Data Layer · Register" />
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Register-Tabelle */}
            <div className="border border-[var(--line)] bg-[var(--surface)]">
              <div className="px-3 py-2 border-b border-[var(--line)] text-[10px] tracking-[0.3em] text-[var(--ink-dim)] uppercase">
                LS_Register
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {REGISTERS.map((r) => (
                    <tr key={r.name} className="border-b border-[var(--line)] last:border-0">
                      <td className="px-3 py-2 text-[var(--ink)]">{r.name}</td>
                      <td className="px-3 py-2 text-right text-[var(--good)] font-bold text-lg">
                        {r.value}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--ink-dim)] text-xs w-24">
                        {r.note}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[var(--surface-2)]">
                    <td className="px-3 py-2 tracking-widest">GOOD</td>
                    <td className="px-3 py-2 text-right font-bold text-lg" style={{ color: "#ffcc33" }}>
                      79.84
                    </td>
                    <td className="px-3 py-2 text-right text-xs" style={{ color: "#ffcc33" }}>
                      #ffcc33
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Ketten */}
            <div className="border border-[var(--line)] bg-[var(--surface)] px-3 py-3 space-y-5">
              <div>
                <div className="text-[10px] tracking-[0.3em] text-[var(--ink-dim)] uppercase mb-2">
                  Dr-Kette · Reduktion
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {DR_CHAIN.map((v, i) => (
                    <span key={i} className="flex items-center gap-1 sm:gap-2">
                      <span
                        className={
                          "px-2.5 py-1 border text-base font-bold transition-colors " +
                          (i === chainStep
                            ? "border-[var(--good)] text-black bg-[var(--good)]"
                            : "border-[var(--line)] text-[var(--good)]")
                        }
                      >
                        {v}
                      </span>
                      {i < DR_CHAIN.length - 1 && <span className="text-[var(--good-dim)]">-&gt;</span>}
                    </span>
                  ))}
                  <span className="text-[var(--ink-dim)] text-xs ml-1">/ 9 = Rest 0</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.3em] text-[var(--ink-dim)] uppercase mb-2">
                  Neue Wurzel · Wachstum
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                  {WURZEL.map((v, i) => (
                    <span key={i} className="flex items-center gap-1 sm:gap-2">
                      <span className="px-2.5 py-1 border border-[var(--good)] text-[var(--good)] font-bold">
                        {v}
                      </span>
                      {i < WURZEL.length - 1 && <span className="text-[var(--good-dim)]">-</span>}
                    </span>
                  ))}
                </div>
                <p className="text-[var(--ink-dim)] text-xs mt-2">
                  3 · 9 · 81 · 243 · 756 — Wurzel läuft im Feld, Figur liest, Funktion feuert.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 02 FIGUR ================= */}
        <section aria-label="Figur Eye Brain Open">
          <SectionHead nr="02" title="Figur" sub="Eye Brain Open · drei Blöcke" />
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {/* EYE */}
            <div className="border border-[var(--line)] bg-[var(--surface)] flex flex-col">
              <div className="px-3 py-2 border-b border-[var(--line)] flex justify-between items-center">
                <span className="text-[var(--good)] font-bold tracking-[0.25em] text-sm">EYE</span>
                <span className="text-[10px] text-[var(--ink-dim)] tracking-widest">CAMERA INPUT</span>
              </div>
              <div className="relative h-40 bg-black overflow-hidden">
                {camState === "live" ? (
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <svg viewBox="0 0 200 120" className="w-full h-full" aria-label="Eye">
                    <path
                      d="M10 60 Q100 -10 190 60 Q100 130 10 60 Z"
                      fill="none"
                      stroke="#ffcc33"
                      strokeWidth="2"
                    />
                    <g className="scanx">
                      <circle cx="100" cy="60" r="26" fill="none" stroke="#ffcc33" strokeWidth="2" />
                      <g className="iris">
                        <circle cx="100" cy="60" r="11" fill="#ffcc33" />
                        <circle cx="100" cy="60" r="4" fill="#000" />
                      </g>
                    </g>
                    <line x1="10" y1="60" x2="190" y2="60" stroke="#2a2413" strokeWidth="1" />
                  </svg>
                )}
                <span className="absolute top-1 left-2 text-[10px] text-[var(--good)] tracking-widest">
                  {camState === "live"
                    ? "● LIVE"
                    : camState === "asking"
                      ? "FORDERE AN…"
                      : camState === "blocked"
                        ? "SIMULATION"
                        : "BEREIT"}
                </span>
              </div>
              {/* verstecktes Video-Element für den Live-Feed */}
              {camState !== "live" && <video ref={videoRef} className="hidden" muted playsInline />}
              <div className="px-3 py-3 mt-auto space-y-2">
                <p className="text-xs text-[var(--ink-dim)] leading-relaxed">
                  {camState === "live"
                    ? "Kamera-Feed aktiv. Eye liest das Feld."
                    : camState === "asking"
                      ? "Kamera wird angefordert — Zugriff erlauben, Eye schaltet auf Live."
                      : camState === "blocked"
                        ? "Kein Kamera-Zugriff in dieser Umgebung — Eye-Simulation läuft weiter."
                        : "Kamera-Eingang bereit. Start aktiviert den echten Feed."}
                </p>
                {camState === "live" ? (
                  <button
                    onClick={stopCam}
                    className="w-full border border-[var(--good)] text-[var(--good)] py-1.5 text-xs tracking-[0.25em] hover:bg-[var(--good)] hover:text-black transition-colors"
                  >
                    KAMERA STOP
                  </button>
                ) : (
                  <button
                    onClick={startCam}
                    className="w-full border border-[var(--good)] text-[var(--good)] py-1.5 text-xs tracking-[0.25em] hover:bg-[var(--good)] hover:text-black transition-colors"
                  >
                    KAMERA START
                  </button>
                )}
              </div>
            </div>

            {/* BRAIN */}
            <div className="border border-[var(--line)] bg-[var(--surface)] flex flex-col">
              <div className="px-3 py-2 border-b border-[var(--line)] flex justify-between items-center">
                <span className="text-[var(--good)] font-bold tracking-[0.25em] text-sm">BRAIN</span>
                <span className="text-[10px] text-[var(--ink-dim)] tracking-widest">VULKAN GPU</span>
              </div>
              <div className="h-40 px-3 py-3 flex items-end gap-1.5 bg-black" aria-hidden="true">
                {[0.9, 0.5, 1.2, 0.7, 1.5, 0.6, 1.1, 0.8, 1.35, 0.55, 1.0, 0.75].map((d, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-[var(--good)] pumpbar"
                    style={{ height: "85%", animationDuration: `${d}s`, opacity: 0.35 + (i % 4) * 0.18 }}
                  />
                ))}
              </div>
              <div className="px-3 py-3 mt-auto space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">RENDER-PFAD</span>
                  <span className="text-[var(--good)]">VULKAN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">KERNEL</span>
                  <span className="text-[var(--good)]">LS_Main_Kernel 729</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">STATUS</span>
                  <span className="text-[var(--good)]">RECHNET</span>
                </div>
              </div>
            </div>

            {/* CO-CPU */}
            <div className="border border-[var(--line)] bg-[var(--surface)] flex flex-col">
              <div className="px-3 py-2 border-b border-[var(--line)] flex justify-between items-center">
                <span className="text-[var(--good)] font-bold tracking-[0.25em] text-sm">CO-CPU</span>
                <span className="text-[10px] text-[var(--ink-dim)] tracking-widest">SOCKEL WÄHLEN</span>
              </div>
              <div className="px-3 py-3 space-y-2">
                {CPUS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCpu(c)}
                    aria-pressed={cpu.id === c.id}
                    className={
                      "w-full text-left px-3 py-2 border text-sm tracking-widest transition-colors " +
                      (cpu.id === c.id
                        ? "border-[var(--good)] bg-[var(--good)] text-black font-bold"
                        : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--good)]")
                    }
                  >
                    {c.id}
                    <span className={"float-right text-xs " + (cpu.id === c.id ? "text-black" : "text-[var(--ink-dim)]")}>
                      {c.cores}
                    </span>
                  </button>
                ))}
              </div>
              <div className="px-3 py-3 mt-auto border-t border-[var(--line)] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">AKTIV</span>
                  <span className="text-[var(--good)] font-bold">{cpu.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">BASIS / BOOST</span>
                  <span className="text-[var(--good)]">
                    {cpu.clock} / {cpu.boost}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-dim)]">INDEX</span>
                  <span className="text-[var(--good)]">LS_Index_Hub 243</span>
                </div>
              </div>
            </div>
          </div>

          {/* 9×9 MASTER MATRIX */}
          <div className="border border-[var(--line)] bg-[var(--surface)] mt-4">
            <div className="px-3 py-2 border-b border-[var(--line)] flex flex-wrap gap-2 justify-between items-center">
              <span className="text-[10px] tracking-[0.3em] text-[var(--ink-dim)] uppercase">
                9×9 Master Matrix · LS_City_Desert 81 — Zelle antippen zum Setzen
              </span>
              <span className="text-xs">
                <span className="text-[var(--ink-dim)]">AKTIV </span>
                <span className="text-[var(--good)] font-bold">{activeCount}</span>
                <span className="text-[var(--ink-dim)]"> / 81</span>
              </span>
            </div>
            <div className="p-3 flex flex-col sm:flex-row gap-4">
              <div
                className="grid grid-cols-9 gap-1 w-full max-w-[360px] mx-auto sm:mx-0"
                role="group"
                aria-label="9x9 Master Matrix"
              >
                {cells.map((on, i) => (
                  <button
                    key={i}
                    onClick={() => toggleCell(i)}
                    aria-pressed={on}
                    aria-label={`Zelle ${i + 1} ${on ? "aktiv" : "leer"}`}
                    className={
                      "aspect-square border transition-colors " +
                      (on
                        ? "bg-[var(--good)] border-[var(--good)]"
                        : "bg-black border-[var(--line)] hover:border-[var(--good-dim)]")
                    }
                  />
                ))}
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <p className="text-[var(--ink-dim)] leading-relaxed">
                  Startmuster: beide Diagonalen + Zentrum — die Figur steht im Feld.
                  Jede Zelle ist ein Schalter der City-Desert-Schicht (81 = 3^4).
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={fillMatrix}
                    className="border border-[var(--good)] text-[var(--good)] px-3 py-1.5 tracking-[0.2em] hover:bg-[var(--good)] hover:text-black transition-colors"
                  >
                    ALLE SETZEN
                  </button>
                  <button
                    onClick={clearMatrix}
                    className="border border-[var(--line)] text-[var(--ink)] px-3 py-1.5 tracking-[0.2em] hover:border-[var(--good)] transition-colors"
                  >
                    LEEREN
                  </button>
                </div>
                <p className="text-[var(--ink-dim)]">
                  Q9 = 19683 = 3^9 — neun Stufen, neun Reihen, ein Kern.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================= 03 FUNKTION ================= */}
        <section aria-label="Funktion Pipeline Pumpe Katapult">
          <SectionHead nr="03" title="Funktion" sub="Pipeline + Pumpe + Katapult · bereit & läuft" />
          <div className="border border-[var(--line)] bg-[var(--surface)] mt-4">
            {/* Fluss-Strecke */}
            <div className="px-3 sm:px-5 py-5">
              <div className="flex items-stretch gap-2 sm:gap-3">
                {/* PUMPE */}
                <div className="border border-[var(--good)] px-2 sm:px-4 py-3 text-center min-w-[86px]">
                  <div className="text-[var(--good)] font-bold tracking-[0.2em] text-xs sm:text-sm">PUMPE</div>
                  <div className="flex items-end justify-center gap-1 h-8 mt-2" aria-hidden="true">
                    {[0.7, 1.0, 0.55].map((d, i) => (
                      <div
                        key={i}
                        className={"w-2 bg-[var(--good)] " + (running ? "pumpbar" : "")}
                        style={{ height: "100%", animationDuration: `${d}s` }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-[var(--ink-dim)] mt-1">DRUCK AUFBAU</div>
                </div>

                {/* PIPELINE */}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="text-center text-[10px] tracking-[0.3em] text-[var(--ink-dim)] mb-1">
                    PIPELINE
                  </div>
                  <div className="relative h-4 border-y-2 border-[var(--good)] bg-black overflow-hidden">
                    {running && (
                      <>
                        <span className="flowdot" style={{ animationDelay: "0s" }} />
                        <span className="flowdot" style={{ animationDelay: "0.5s" }} />
                        <span className="flowdot" style={{ animationDelay: "1s" }} />
                      </>
                    )}
                  </div>
                  <div className="text-center text-[10px] text-[var(--ink-dim)] mt-1">
                    {running ? "FLUSS AKTIV →→→" : "FLUSS ANGEHALTEN"}
                  </div>
                </div>

                {/* KATAPULT */}
                <div className="border border-[var(--good)] px-2 sm:px-4 py-3 text-center min-w-[86px] relative overflow-visible">
                  <div className="text-[var(--good)] font-bold tracking-[0.2em] text-xs sm:text-sm">KATAPULT</div>
                  <svg viewBox="0 0 80 44" className="w-16 h-9 mx-auto mt-1" aria-hidden="true">
                    <line x1="8" y1="38" x2="72" y2="38" stroke="#ffcc33" strokeWidth="2" />
                    <line x1="40" y1="38" x2="40" y2="14" stroke="#ffcc33" strokeWidth="2" />
                    <line x1="40" y1="14" x2="66" y2="6" stroke="#ffcc33" strokeWidth="2" />
                    {running && <circle cx="66" cy="6" r="4" fill="#ffcc33" className="launch" />}
                  </svg>
                  <div className="text-[10px] text-[var(--ink-dim)]">
                    SCHÜSSE <span className="text-[var(--good)] font-bold">{shots}</span>
                  </div>
                </div>
              </div>

              {/* Steuerung */}
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={() => setRunning((r) => !r)}
                  aria-pressed={running}
                  className={
                    "px-5 py-2 border text-xs tracking-[0.25em] font-bold transition-colors " +
                    (running
                      ? "bg-[var(--good)] text-black border-[var(--good)]"
                      : "border-[var(--good)] text-[var(--good)] hover:bg-[var(--good)] hover:text-black")
                  }
                >
                  {running ? "■ LÄUFT — STOP" : "▶ START"}
                </button>
                <span className="text-xs">
                  <span className="text-[var(--ink-dim)]">STATUS </span>
                  <span className="text-[var(--good)] font-bold">
                    {running ? "BEREIT + ARBEITET" : "BEREIT"}
                  </span>
                </span>
                <span className="text-xs text-[var(--ink-dim)]">
                  Pumpe → Pipeline → Katapult: ein Takt, ein Schuss pro Zyklus.
                </span>
              </div>
            </div>

            {/* Katapult-Redirect-Tests */}
            <div className="border-t border-[var(--line)] px-3 sm:px-5 py-4 bg-[var(--surface-2)]">
              <div className="text-[10px] tracking-[0.3em] text-[var(--ink-dim)] uppercase mb-3">
                Redirect-Katapult testen · Ziel: pair.sys
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="file:///H:/hh/pair.sys/index.html"
                  target="_blank"
                  rel="noopener"
                  className="flex-1 text-center border-2 border-[var(--good)] text-[var(--good)] font-bold tracking-[0.2em] text-sm px-4 py-3 hover:bg-[var(--good)] hover:text-black transition-colors"
                >
                  ⚀ KATAPULT → pair.sys/index.html
                </a>
                <a
                  href="file:///H:/hh/pair.sys/final.move.html"
                  target="_blank"
                  rel="noopener"
                  className="flex-1 text-center border-2 border-[var(--good)] text-[var(--good)] font-bold tracking-[0.2em] text-sm px-4 py-3 hover:bg-[var(--good)] hover:text-black transition-colors"
                >
                  ⚀ KATAPULT → pair.sys/final.move.html
                </a>
              </div>
              <p className="text-[11px] text-[var(--ink-dim)] mt-3">
                Die Buttons feuern den Browser direkt auf die lokale Zieldatei — so wird der
                Redirect des Katapults geprüft. Funktioniert nur, wenn diese Seite selbst als
                file:///H:/hh/in.ni/index.html geöffnet ist und pair.sys daneben liegt.
              </p>
            </div>
          </div>
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-[var(--line)] pt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] tracking-[0.2em] text-[var(--ink-dim)] uppercase">
          <span>in.ni · Eye Brain Open Co-CPU</span>
          <span>file:///H:/hh/in.ni/index.html</span>
          <span className="ml-auto" style={{ color: "#ffcc33" }}>
            GOOD 79.84 · #ffcc33
          </span>
        </footer>
      </main>
    </div>
  );
}
