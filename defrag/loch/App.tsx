import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Braces, Check, Copy, Download, FileCode2, KeyRound, Lock, Play, Radio, RotateCcw, Shield, Terminal, Zap } from "lucide-react";

const S = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const R = (n: string) => ({ $ref: `#/components/responses/${n}` });
const IK = [{ $ref: "#/components/parameters/IdempotencyKey" }];
const ok = (desc: string, schema: unknown) => ({ description: desc, content: { "application/json": { schema } } });
const op = (tags: string[], operationId: string, summary: string, scopes: string[], extra: Record<string, unknown> = {}) => ({
  tags, operationId, summary, security: scopes.length ? [{ BearerAuth: scopes }] : [], ...extra,
});

const OPENAPI: Record<string, unknown> = {
  openapi: "3.1.0",
  info: { title: "cycOS DJINN API", version: "1.0.0", description: "Browser-based Multi-World Runtime - Global Bus, Domains, Bridge" },
  servers: [{ url: "/api/v1", description: "DJINN Bridge (same-origin / file-safe mock)" }],
  tags: [{ name: "System" }, { name: "State" }, { name: "Domains" }, { name: "Economy" }, { name: "Decision" }, { name: "Config" }, { name: "Bridge" }, { name: "Events" }],
  paths: {
    "/health": { get: op(["System"], "getHealth", "Runtime health", [], { responses: { "200": ok("UP", { type: "object", properties: { status: { type: "string", example: "UP" }, runtime: { type: "string", example: "DJINN" }, version: { type: "string", example: "1.0.0" } } }) } }) },
    "/state": {
      get: op(["State"], "getState", "Read GLOBAL_STATE", ["viewer"], { responses: { "200": ok("Current global state", S("GlobalState")), "401": R("Unauthorized") } }),
      patch: op(["State"], "patchState", "Patch GLOBAL_STATE (partial, bus broadcast)", ["operator"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("GlobalStatePatch") } } }, responses: { "200": ok("Patched state", S("GlobalState")), "409": R("IdempotencyConflict"), "422": R("Unprocessable") } }),
    },
    "/aura": {
      get: op(["Domains"], "getAura", "Read aura (Nutzraum-OS)", ["viewer"], { responses: { "200": ok("Aura value", S("AuraValue")) } }),
      put: op(["Domains"], "putAura", "Set aura 0..1", ["operator"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("AuraValue") } } }, responses: { "200": ok("Stored", S("AuraValue")), "409": R("IdempotencyConflict") } }),
    },
    "/dr": {
      get: op(["Domains"], "getDr", "Read Dr (MORPH-EDIT)", ["viewer"], { responses: { "200": ok("Dr value", S("DrValue")) } }),
      put: op(["Domains"], "putDr", "Set Dr (enum 81,27,9,3,0)", ["operator"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("DrValue") } } }, responses: { "200": ok("Stored", S("DrValue")), "409": R("IdempotencyConflict") } }),
    },
    "/economy": { get: op(["Economy"], "getEconomy", "Read Ω / Q9", ["viewer"], { responses: { "200": ok("Economy output", S("Economy")) } }) },
    "/economy/recalculate": { post: op(["Economy"], "recalculateEconomy", "Recompute Ω = f(aura, Dr, ampel, uni)", ["operator"], { parameters: IK, requestBody: { content: { "application/json": { schema: { type: "object", properties: { source: { type: "string", example: "bridge" } } } } } }, responses: { "200": ok("Recalculated", S("Economy")) } }) },
    "/gate": { get: op(["Decision"], "getGate", "Read gate state", ["viewer"], { responses: { "200": ok("Gate state", S("GateState")) } }) },
    "/gate/evaluate": { post: op(["Decision"], "evaluateGate", "Evaluate gate = (Ω≥0.42 ∧ FPS≥60 ∧ GOOD≥79.84)", ["operator"], { responses: { "200": ok("Gate result", { type: "object", properties: { result: { type: "string", enum: ["OPEN", "CLOSED", "LOCKED", "OVERRIDE"] }, omega: { type: "number" }, fps: { type: "number" }, good: { type: "number" } } }) } }) },
    "/ampel": {
      get: op(["Domains"], "getAmpel", "Read WILLKLICK ampel", ["viewer"], { responses: { "200": ok("Ampel state", S("AmpelState")) } }),
      put: op(["Domains"], "putAmpel", "Set ampel GRUEN/GELB/ROT", ["world"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("AmpelState") } } }, responses: { "200": ok("Stored", S("AmpelState")) } }),
    },
    "/uni": { get: op(["Domains"], "getUni", "Read UNI vector S0..S4 + Ωtotal (S0 driven by FPS)", ["viewer"], { responses: { "200": ok("UNI state", S("UniState")) } }) },
    "/config": {
      get: op(["Config"], "getConfig", "Read INI config", ["admin"], { responses: { "200": ok("Config", S("Config")) } }),
      put: op(["Config"], "putConfig", "Replace INI config", ["admin"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("Config") } } }, responses: { "200": ok("Stored", S("Config")) } }),
    },
    "/config/validate": { post: op(["Config"], "validateConfig", "Validate INI (required sections + keys)", ["admin"], { requestBody: { required: true, content: { "application/json": { schema: S("Config") } } }, responses: { "200": ok("Validation result", { type: "object", properties: { valid: { type: "boolean" }, warnings: { type: "array", items: { type: "string" } }, errors: { type: "array", items: { type: "string" } } } }) } }) },
    "/bridge/reset": { post: op(["Bridge"], "bridgeReset", "Reset GLOBAL_STATE to defaults", ["bridge"], { responses: { "200": ok("Reset done", S("GlobalState")) } }) },
    "/bridge/sync": { post: op(["Bridge"], "bridgeSync", "Force STATE_SYNC broadcast to all worlds", ["bridge"], { responses: { "200": ok("Synced", S("GlobalState")) } }) },
    "/bridge/override": { post: op(["Bridge"], "bridgeOverride", "Master override patch (bypasses world RBAC)", ["bridge"], { parameters: IK, requestBody: { required: true, content: { "application/json": { schema: S("GlobalStatePatch") } } }, responses: { "200": ok("Overridden state", S("GlobalState")) } }) },
    "/events/schemas/{type}/{version}": { get: op(["Events"], "getEventSchema", "Event schema registry lookup", ["viewer"], { parameters: [{ name: "type", in: "path", required: true, schema: { type: "string" } }, { name: "version", in: "path", required: true, schema: { type: "string", example: "1.0" } }], responses: { "200": ok("JSON Schema for event type/version", S("Event")), "404": R("NotFound") } }) },
  },
  components: {
    parameters: { IdempotencyKey: { name: "Idempotency-Key", in: "header", required: false, description: "UUID v4. Replay with same payload → 200 + original response (24h). Same key, different payload → 409.", schema: { type: "string", format: "uuid" } } },
    responses: {
      Unauthorized: ok("Missing/invalid credentials", S("Error")),
      NotFound: ok("Not found", S("Error")),
      Unprocessable: ok("Validation failed", S("Error")),
      IdempotencyConflict: ok("Idempotency-Key reused with different payload", S("Error")),
    },
    schemas: {
      GlobalState: { type: "object", required: ["aura", "Dr", "omega", "q9", "fps", "good", "gate", "ampel"], properties: { aura: { type: "number", minimum: 0, maximum: 1, example: 0.81 }, Dr: { type: "integer", enum: [81, 27, 9, 3, 0], example: 27 }, omega: { type: "number", minimum: 0, maximum: 1, example: 0.44 }, q9: { type: "number", minimum: 0, maximum: 1, example: 0.91 }, fps: { type: "number", example: 60 }, good: { type: "number", minimum: 0, maximum: 100, example: 84.3 }, gate: { type: "boolean", example: true }, ampel: { type: "string", enum: ["GRUEN", "GELB", "ROT"], example: "GRUEN" } } },
      GlobalStatePatch: { type: "object", description: "All fields optional; only present keys are patched + broadcast.", properties: { aura: { type: "number", minimum: 0, maximum: 1 }, Dr: { type: "integer", enum: [81, 27, 9, 3, 0] }, fps: { type: "number" }, good: { type: "number", minimum: 0, maximum: 100 }, ampel: { type: "string", enum: ["GRUEN", "GELB", "ROT"] } } },
      AuraValue: { type: "object", required: ["value"], properties: { value: { type: "number", minimum: 0, maximum: 1, example: 0.73 } } },
      DrValue: { type: "object", required: ["value"], properties: { value: { type: "integer", enum: [81, 27, 9, 3, 0], example: 81 } } },
      Economy: { type: "object", required: ["omega", "q9"], properties: { omega: { type: "number", minimum: 0, maximum: 1, example: 0.47 }, q9: { type: "number", minimum: 0, maximum: 1, example: 0.88 } } },
      GateState: { type: "object", required: ["state"], properties: { state: { type: "string", enum: ["OPEN", "CLOSED", "LOCKED", "OVERRIDE"], example: "OPEN" }, omega: { type: "number" }, fps: { type: "number" }, good: { type: "number" } } },
      AmpelState: { type: "object", required: ["state"], properties: { state: { type: "string", enum: ["GRUEN", "GELB", "ROT"], example: "GRUEN" } } },
      UniState: { type: "object", required: ["S0", "S1", "S2", "S3", "S4", "omegaTotal"], properties: { S0: { type: "number", example: 0.81 }, S1: { type: "number", example: 0.42 }, S2: { type: "number", example: 0.61 }, S3: { type: "number", example: 0.77 }, S4: { type: "number", example: 0.91 }, omegaTotal: { type: "number", example: 0.7 } } },
      Config: { type: "object", required: ["ini"], properties: { ini: { type: "string", example: "[SLI]\nLinks=4\nMode=AFR\n" }, format: { type: "string", enum: ["ini"], default: "ini" } } },
      Event: { type: "object", required: ["id", "type", "source", "timestamp", "version", "payload"], properties: { id: { type: "string", pattern: "^evt-[A-Za-z0-9-]+$", example: "evt-001" }, type: { type: "string", enum: ["HELLO", "INIT", "READY", "STATE_PATCH", "STATE_SYNC", "STATE_RESET", "AURA_CHANGED", "DR_CHANGED", "OMEGA_CHANGED", "Q9_CHANGED", "AMPEL_CHANGED", "GATE_OPENED", "GATE_CLOSED", "GATE_LOCKED", "ECONOMY_RECALCULATED", "VALIDATION_SUCCESS", "VALIDATION_FAILED", "ERROR"] }, source: { type: "string", example: "nutzraum" }, timestamp: { type: "integer", format: "int64", example: 1730000000 }, version: { type: "string", example: "1.0" }, idempotencyKey: { type: "string", format: "uuid" }, payload: { type: "object", additionalProperties: true } } },
      Error: { type: "object", required: ["code", "message"], properties: { code: { type: "string", example: "DJN-409" }, message: { type: "string", example: "idempotency key reused with different payload" }, details: { type: "object", additionalProperties: true } } },
    },
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "JWT for users/operators. Scopes = RBAC roles: viewer, world, operator, admin, bridge." },
      ApiKeyAuth: { type: "apiKey", in: "header", name: "X-DJINN-KEY", description: "Per-world API key. A world may only emit its own domain events." },
    },
  },
  security: [{ BearerAuth: ["viewer"] }],
};

const EVENT_TYPES = ["HELLO", "INIT", "READY", "STATE_PATCH", "STATE_SYNC", "STATE_RESET", "AURA_CHANGED", "DR_CHANGED", "OMEGA_CHANGED", "Q9_CHANGED", "AMPEL_CHANGED", "GATE_OPENED", "GATE_CLOSED", "GATE_LOCKED", "ECONOMY_RECALCULATED", "VALIDATION_SUCCESS", "VALIDATION_FAILED", "ERROR"];
const EVENTS_REGISTRY = {
  registry: "djinn/events", generatedFor: "OpenAPI 3.1 / DJINN v1.0", current: "1.0", supported: ["1.0", "0.9"],
  rule: "Bridge always supports N and N-1. Unknown MAJOR → ERROR DJN-426 + HELLO renegotiation.",
  events: EVENT_TYPES.map((t) => ({ type: t, versions: { "1.0": { schema: "#/components/schemas/Event", status: "current" }, "0.9": { schema: "legacy (no version/idempotencyKey fields)", status: "deprecated, accepted until N+1" } }, endpoint: `/api/v1/events/schemas/${t}/1.0` })),
};

function toYaml(v: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (Array.isArray(v)) {
    if (!v.length) return "[]";
    return v.map((i) => {
      if (i && typeof i === "object") {
        const lines = toYaml(i, indent + 1).split("\n");
        return `${pad}- ${lines[0].trimStart()}\n${lines.slice(1).join("\n")}`;
      }
      return `${pad}- ${scalar(i)}`;
    }).join("\n");
  }
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>);
    if (!entries.length) return "{}";
    return entries.map(([k, val]) => (val && typeof val === "object" ? `${pad}${k}:\n${toYaml(val, indent + 1)}` : `${pad}${k}: ${scalar(val)}`)).join("\n");
  }
  return scalar(v);
}
function scalar(v: unknown): string {
  if (typeof v === "string") return /[:#\[\]{}&*!|>'"%@`,\n]/.test(v) || v === "" ? JSON.stringify(v) : v;
  return String(v);
}
const OPENAPI_JSON = JSON.stringify(OPENAPI, null, 2);
const OPENAPI_YAML = toYaml(OPENAPI);
const REGISTRY_JSON = JSON.stringify(EVENTS_REGISTRY, null, 2);

function copyText(text: string, setDone: (s: string) => void, label: string) {
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); setDone(label); } catch { setDone(""); }
  document.body.removeChild(ta);
  setTimeout(() => setDone(""), 1600);
}
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
function Highlight({ code, lang }: { code: string; lang: "yaml" | "json" }) {
  const html = useMemo(() => {
    let e = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    e = e.replace(/("(\\.|[^"\\])*")(\s*:)?/g, (_m, s: string, _x: string, colon?: string) => (colon ? `<span style="color:#ffd700">${s}</span>:` : `<span style="color:#7ee2a8">${s}</span>`));
    e = e.replace(/\b(true|false|null)\b/g, '<span style="color:#ff9ecb">$1</span>');
    if (lang === "yaml") e = e.replace(/^(\s*)([A-Za-z0-9_/.-]+):/gm, '$1<span style="color:#ffd700">$2</span>:');
    return e;
  }, [code, lang]);
  return <pre className="mono overflow-x-auto p-4 text-[12px] leading-relaxed" style={{ color: "var(--text)" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

async function api(action: string, args: Record<string, unknown>) {
  const res = await fetch("actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, args }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(typeof data.error === "string" ? data.error : `HTTP ${res.status}`);
  return data.data;
}

type GState = { aura: number; Dr: number; omega: number; q9: number; fps: number; good: number; gate: boolean; ampel: string };
const DEFAULTS: GState = { aura: 0.81, Dr: 27, omega: 0.44, q9: 0.91, fps: 60, good: 84.3, gate: true, ampel: "GRUEN" };
const uuid = () => "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16); });

export default function App() {
  const [tab, setTab] = useState<"yaml" | "json">("yaml");
  const [copied, setCopied] = useState("");
  const [state, setState] = useState<GState>({ ...DEFAULTS });
  const [fDr, setFDr] = useState(81);
  const [fAura, setFAura] = useState(0.73);
  const [fAmpel, setFAmpel] = useState("GRUEN");
  const [fFps, setFFps] = useState(60);
  const [fGood, setFGood] = useState(84.3);
  const [idemKey, setIdemKey] = useState(uuid());
  const [log, setLog] = useState<string[]>(["HELLO bridge → INIT GLOBAL_STATE v1.0 · Q9 19683 (3^9)"]);
  const idemStore = useRef(new Map<string, string>());
  const seq = useRef(1);
  const [savedRuns, setSavedRuns] = useState(0);
  const [backend, setBackend] = useState("lädt …");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api("records.list", { collection: "tester_runs", limit: 100 });
        if (!alive) return;
        const records = (data?.records ?? []) as { value?: { state?: GState } }[];
        setSavedRuns(records.length);
        setBackend("verbunden");
        const latest = records[records.length - 1]?.value?.state;
        if (latest) setState(latest);
      } catch {
        if (alive) setBackend("offline (Vorschau ohne API) — Tester lokal nutzbar");
      }
    })();
    return () => { alive = false; };
  }, []);

  const econ = (s: GState) => {
    const amp = s.ampel === "GRUEN" ? 0.2 : s.ampel === "GELB" ? 0.1 : 0;
    const omega = Math.min(1, Math.max(0, s.aura * 0.5 + (s.Dr / 81) * 0.3 + amp));
    const q9 = Math.min(1, Math.max(0, omega * 0.7 + s.aura * 0.3));
    return { omega: +omega.toFixed(3), q9: +q9.toFixed(3) };
  };
  const applyPatch = (patch: Partial<GState>) => {
    const payloadHash = JSON.stringify(patch);
    const prev = idemStore.current.get(idemKey);
    if (prev && prev !== payloadHash) {
      setLog((l) => ["✕ 409 IdempotencyConflict — key reused with different payload (DJN-409)", ...l].slice(0, 9));
      return;
    }
    idemStore.current.set(idemKey, payloadHash);
    const merged = { ...state, ...patch };
    const e = econ(merged);
    const next = { ...merged, ...e, gate: e.omega >= 0.42 && merged.fps >= 60 && merged.good >= 79.84 };
    const id = `evt-${String(seq.current++).padStart(3, "0")}`;
    setState(next);
    setLog((l) => [`${id} STATE_PATCH ← tester ${JSON.stringify(patch)} → Ω ${next.omega} · Q9 ${next.q9} · Gate ${next.gate ? "OPEN" : "CLOSED"} · 200 (key ${idemKey.slice(0, 8)}…)`, ...l].slice(0, 9));
    void (async () => {
      try {
        await api("records.create", { collection: "tester_runs", value: { event: id, patch, state: next, idempotencyKey: idemKey, at: Date.now() }, idempotency_key: idemKey });
        setSavedRuns((n) => n + 1);
        setBackend("verbunden");
      } catch (err) {
        setLog((l) => [`✕ Speichern fehlgeschlagen: ${err instanceof Error ? err.message : String(err)} (lokaler State bleibt)`, ...l].slice(0, 9));
      }
    })();
  };

  const endpoints: [string, string, string][] = [
    ["GET", "/health", "public"], ["GET", "/state", "viewer"], ["PATCH", "/state", "operator · Idempotency-Key"],
    ["GET", "/aura", "viewer"], ["PUT", "/aura", "operator"], ["GET", "/dr", "viewer"], ["PUT", "/dr", "operator · enum 81/27/9/3/0"],
    ["GET", "/economy", "viewer"], ["POST", "/economy/recalculate", "operator"], ["GET", "/gate", "viewer"], ["POST", "/gate/evaluate", "operator"],
    ["GET", "/ampel", "viewer"], ["PUT", "/ampel", "world · GRUEN/GELB/ROT"], ["GET", "/uni", "viewer"],
    ["GET", "/config", "admin"], ["PUT", "/config", "admin"], ["POST", "/config/validate", "admin"],
    ["POST", "/bridge/reset", "bridge"], ["POST", "/bridge/sync", "bridge"], ["POST", "/bridge/override", "bridge"],
    ["GET", "/events/schemas/{type}/{version}", "viewer · registry"],
  ];
  const roles: [string, string, string][] = [
    ["VIEWER", "read only", "GET /state, /aura, /dr, /economy, /gate, /ampel, /uni"],
    ["WORLD", "send own events", "PUT /ampel (own domain), PATCH /state (own keys only, X-DJINN-KEY)"],
    ["OPERATOR", "Dr / Aura change", "PUT /dr, PUT /aura, POST /economy/recalculate, /gate/evaluate"],
    ["ADMIN", "Config + Reset", "GET/PUT /config, POST /config/validate, POST /bridge/reset"],
    ["BRIDGE", "full access", "override, sync, reset — master orchestration, N & N-1 negotiation"],
  ];

  const codeBlock = (title: string, code: string) => (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)", background: "#040a16" }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--line)" }}>
        <span className="mono text-[11px]" style={{ color: "var(--muted)" }}>{title}</span>
        <button onClick={() => copyText(code, setCopied, title)} className="mono flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: "var(--line)", color: "var(--gold)" }}>
          {copied === title ? <Check size={12} /> : <Copy size={12} />} {copied === title ? "Kopiert" : "Copy"}
        </button>
      </div>
      <pre className="mono overflow-x-auto p-4 text-[12px] leading-relaxed" style={{ color: "var(--text)" }}>{code}</pre>
    </div>
  );
  const panel = "rounded-2xl border p-5";
  const h2 = "text-xl font-bold tracking-tight";
  const gold = { color: "var(--gold)" } as const;

  return (
    <div data-safe-area-inset-root className="min-h-screen w-full overflow-x-clip" style={{ boxSizing: "border-box", paddingTop: "var(--safe-area-inset-top)", background: "var(--bg)", color: "var(--text)" }}>
      <script type="application/json" id="openapi-json" dangerouslySetInnerHTML={{ __html: OPENAPI_JSON }} />

      <header data-safe-area-sticky-top className="sticky z-40 border-b backdrop-blur" style={{ top: "var(--safe-area-inset-top)", borderColor: "var(--line)", background: "rgba(2,6,10,.92)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <Terminal size={18} style={gold} />
          <span className="font-bold tracking-wide">cycOS · DJINN</span>
          <span className="mono text-[11px]" style={{ color: "var(--muted)" }}>OpenAPI 3.1 · Event Versioning · Auth · Q9 19683</span>
          <nav className="mono ml-auto flex flex-wrap gap-3 text-[11px]">
            {[["#spec", "Spec"], ["#events", "Events"], ["#idem", "Idempotenz"], ["#auth", "Auth"], ["#ws", "WebSocket"], ["#tester", "Tester"]].map(([h, l]) => (
              <a key={h} href={h} style={gold}>{l}</a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="py-10">
          <p className="mono text-[11px] tracking-[.25em]" style={gold}>DJINN API SPECIFICATION v1.0 — PRODUCTION DOCS</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-5xl">Ein Bus. Viele Welten.<br /><span style={gold}>Ein Vertrag: OpenAPI 3.1.</span></h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Browser-basierte Multi-World Runtime: GLOBAL_STATE als zentraler Event-Bus, Domänen (Nutzraum-OS, MORPH-EDIT, ECONOMY, WILLKLICK, UNI),
            Gate-Engine <span className="mono" style={{ color: "var(--text)" }}>(Ω ≥ 0.42 ∧ FPS ≥ 60 ∧ GOOD ≥ 79.84)</span> und die Bridge als Master.
            REST für Kommandos, Events für Synchronisation — unten live testbar, ganz ohne Server.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => download("openapi.yaml", OPENAPI_YAML, "text/yaml")} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-black" style={{ background: "var(--gold)" }}><Download size={15} /> openapi.yaml</button>
            <button onClick={() => download("openapi.json", OPENAPI_JSON, "application/json")} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}><Download size={15} /> openapi.json</button>
            <button onClick={() => download("events-registry.json", REGISTRY_JSON, "application/json")} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--line)", color: "var(--text)" }}><Download size={15} /> events-registry.json</button>
            <a href="#tester" className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--line)" }}><Play size={15} style={gold} /> Zum Live-Tester</a>
          </div>
          <div className="mono mt-6 grid grid-cols-2 gap-2 text-[12px] md:grid-cols-4">
            {[["Base", "/api/v1"], ["WS", "ws://localhost:9090/djinn"], ["Q9", "19683 = 3⁹"], ["Rate Limit", "60/min pro Welt"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--surface)" }}><span style={{ color: "var(--muted)" }}>{k} </span>{v}</div>
            ))}
          </div>
        </section>

        <section className={`${panel} mb-6`} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <h2 className={h2}>Endpoints <span className="mono text-xs font-normal" style={{ color: "var(--muted)" }}>servers: /api/v1</span></h2>
          <div className="mt-4 overflow-x-auto">
            <table className="mono w-full min-w-[520px] text-left text-[12px]">
              <thead><tr style={{ color: "var(--muted)" }}><th className="py-2 pr-3">Method</th><th className="py-2 pr-3">Path</th><th className="py-2">Scope / Note</th></tr></thead>
              <tbody>{endpoints.map(([m, p, s]) => (
                <tr key={m + p} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="py-1.5 pr-3 font-semibold" style={{ color: m === "GET" ? "var(--green)" : "var(--gold)" }}>{m}</td>
                  <td className="py-1.5 pr-3">{p}</td><td className="py-1.5" style={{ color: "var(--muted)" }}>{s}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <p className="mono mt-3 text-[11px]" style={{ color: "var(--muted)" }}>Schemas: GlobalState · GlobalStatePatch · AuraValue · DrValue (enum 81/27/9/3/0) · Economy · GateState · AmpelState (GRUEN/GELB/ROT) · UniState · Config · Event · Error — alle als $ref in components.schemas der Spec unten.</p>
        </section>

        <section id="spec" className={`${panel} mb-6`} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <Braces size={18} style={gold} /><h2 className={h2}>OpenAPI Schema</h2>
            <div className="ml-auto flex gap-2">
              {(["yaml", "json"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className="mono rounded-lg px-3 py-1.5 text-xs font-semibold uppercase" style={tab === t ? { background: "var(--gold)", color: "#000" } : { border: "1px solid var(--line)", color: "var(--muted)" }}>{t}</button>
              ))}
              <button onClick={() => copyText(tab === "yaml" ? OPENAPI_YAML : OPENAPI_JSON, setCopied, "spec")} className="mono flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)", color: "var(--gold)" }}>{copied === "spec" ? <Check size={12} /> : <Copy size={12} />} Copy</button>
            </div>
          </div>
          <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border" style={{ borderColor: "var(--line)", background: "#040a16" }}>
            <Highlight code={tab === "yaml" ? OPENAPI_YAML : OPENAPI_JSON} lang={tab} />
          </div>
          <p className="mono mt-3 text-[11px]" style={{ color: "var(--muted)" }}>Die JSON-Fassung liegt zusätzlich als &lt;script type="application/json" id="openapi-json"&gt; im Dokument — maschinenlesbar, file://-sicher, ohne externe Abhängigkeiten.</p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section id="events" className={panel} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2"><Zap size={18} style={gold} /><h2 className={h2}>3 · Event Versioning</h2></div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>Jedes Event trägt <span className="mono" style={{ color: "var(--text)" }}>version</span> + <span className="mono" style={{ color: "var(--text)" }}>idempotencyKey</span>. SemVer: <b style={{ color: "var(--text)" }}>MAJOR</b> breaking · <b style={{ color: "var(--text)" }}>MINOR</b> additive Felder · <b style={{ color: "var(--text)" }}>PATCH</b> Fix ohne Schemaänderung. Die Bridge unterstützt immer <b style={{ color: "var(--text)" }}>N und N−1</b>; unbekannte MAJOR → <span className="mono">ERROR DJN-426</span> + HELLO-Renegotiation.</p>
            <div className="mt-4 space-y-3">
              {codeBlock("Event v1 (aktuell)", `{\n  "id": "evt-001",\n  "type": "STATE_PATCH",\n  "source": "nutzraum",\n  "timestamp": 1730000000,\n  "version": "1.0",\n  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",\n  "payload": { "Dr": 27 }\n}`)}
              {codeBlock("HELLO · Version Negotiation", `→ { "type": "HELLO", "source": "morph-edit",\n    "version": "1.0", "supported": ["1.0", "0.9"] }\n← { "type": "INIT", "version": "1.0",\n    "payload": { "state": { /* GLOBAL_STATE */ } } }`)}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="mono w-full min-w-[420px] text-left text-[12px]">
                <thead><tr style={{ color: "var(--muted)" }}><th className="py-2 pr-3">Migration</th><th className="py-2 pr-3">Änderung</th><th className="py-2">Breaking?</th></tr></thead>
                <tbody>
                  {[["v0.9 → v1.0", "version + idempotencyKey werden Pflichtfelder", "nein (Bridge füllt Defaults)"], ["v0.9 → v1.0", "payload.state → payload (flach) bei STATE_SYNC", "ja — Adapter in Bridge"], ["v0.9 → v1.0", "Ampel-Werte lokalisiert (GRUEN/GELB/ROT)", "nein"], ["v1.0 → v1.1*", "optionale Felder (traceId) — *geplant", "nein (MINOR)"]].map((r) => (
                    <tr key={r[0] + r[1]} className="border-t" style={{ borderColor: "var(--line)" }}>{r.map((c, i) => <td key={i} className="py-1.5 pr-3">{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mono mt-3 text-[11px]" style={{ color: "var(--muted)" }}>Registry: GET /api/v1/events/schemas/{"{type}"}/{"{version}"} → JSON Schema je Event-Typ (siehe Download events-registry.json).</p>
          </section>

          <section id="idem" className={panel} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2"><KeyRound size={18} style={gold} /><h2 className={h2}>4 · Idempotenz</h2></div>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              <li><span className="mono" style={{ color: "var(--text)" }}>Idempotency-Key: &lt;UUID v4&gt;</span> auf allen PATCH/POST/PUT-Schreibzugriffen.</li>
              <li>Server speichert Key <b style={{ color: "var(--text)" }}>24 h</b>. Replay mit identischem Payload → <b style={{ color: "var(--text)" }}>200 + Original-Response</b> (kein Doppel-Patch).</li>
              <li>Gleicher Key, anderer Payload → <b style={{ color: "var(--text)" }}>409 DJN-409</b> — kein Retry mit neuem Key, um die Sperre zu umgehen.</li>
              <li>Events: <span className="mono" style={{ color: "var(--text)" }}>event.id</span> muss eindeutig sein; Dedup-Fenster <b style={{ color: "var(--text)" }}>5 min</b> über Hash aus <span className="mono" style={{ color: "var(--text)" }}>(id + source + timestamp)</span>.</li>
            </ul>
            <div className="mt-4">
              {codeBlock("idempotency.js — Referenzimplementierung", `const idempotencyStore = new Map(); // key -> {hash, response, expiresAt}\nconst TTL = 24 * 60 * 60 * 1000;\n\nfunction handleWrite(key, payload, run) {\n  const hash = hashOf(JSON.stringify(payload));\n  const hit = idempotencyStore.get(key);\n  if (hit && hit.expiresAt > Date.now()) {\n    if (hit.hash !== hash) throw err(409, "DJN-409",\n      "idempotency key reused with different payload");\n    return { status: 200, body: hit.response, replayed: true };\n  }\n  const response = run(); // PATCH anwenden + Bus.emit\n  idempotencyStore.set(key, { hash, response, expiresAt: Date.now() + TTL });\n  return { status: 200, body: response };\n}\n\n// Event-Dedup (5 min):\nconst seen = new Map();\nconst dedupKey = e => hashOf(e.id + e.source + e.timestamp);\nconst isDuplicate = e => seen.has(dedupKey(e));`)}
            </div>
            <p className="mono mt-3 text-[11px]" style={{ color: "var(--muted)" }}>Der Live-Tester unten nutzt exakt diese Semantik: gleicher Key + geänderter Payload → 409 im Event-Log.</p>
          </section>
        </div>

        <section id="auth" className={`${panel} mt-6`} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <div className="flex items-center gap-2"><Shield size={18} style={gold} /><h2 className={h2}>5 · Authentication &amp; Authorization</h2></div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            <b style={{ color: "var(--text)" }}>Welten</b> authentifizieren sich per API-Key (<span className="mono" style={{ color: "var(--text)" }}>X-DJINN-KEY</span>, eine Welt darf nur eigene Events senden),
            <b style={{ color: "var(--text)" }}> Nutzer/Operatoren</b> per JWT (<span className="mono" style={{ color: "var(--text)" }}>Authorization: Bearer</span>). RBAC-Scopes: viewer · world · operator · admin · bridge.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="mono w-full min-w-[560px] text-left text-[12px]">
              <thead><tr style={{ color: "var(--muted)" }}><th className="py-2 pr-3">Rolle</th><th className="py-2 pr-3">Kurz</th><th className="py-2">Erlaubt</th></tr></thead>
              <tbody>{roles.map(([r, s, a]) => (
                <tr key={r} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="py-1.5 pr-3 font-semibold" style={gold}>{r}</td><td className="py-1.5 pr-3">{s}</td><td className="py-1.5" style={{ color: "var(--muted)" }}>{a}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {codeBlock("JWT Payload (Beispiel)", `{\n  "sub": "user-ridvan",\n  "roles": ["operator"],\n  "scopes": ["viewer", "operator"],\n  "iss": "cyos-djinn-bridge",\n  "iat": 1730000000,\n  "exp": 1730003600\n}\n// Header: Authorization: Bearer <jwt>\n// Welt:    X-DJINN-KEY: <per-world key>`)}
            {codeBlock("auth-middleware (Pseudocode)", `function requireScope(scope) {\n  return (req, res, next) => {\n    const jwt = verifyBearer(req.headers.authorization);\n    const key = req.headers["x-djinn-key"];\n    if (jwt && jwt.scopes.includes(scope)) return next();\n    if (key && worldFor(key)?.scope === scope\n        && ownsDomain(key, req)) return next();\n    return res.status(401).json({ code: "DJN-401",\n      message: "missing or insufficient credentials" });\n  };\n}\napp.patch("/state", requireScope("operator"), patchState);`)}
          </div>
          <div className="mono mt-4 grid gap-2 text-[11px] md:grid-cols-3">
            {[["CORS / file://", "file:// ist same-origin-safe im Mock; produktiv CORS nur für Bridge-Origin, keine Wildcards mit Credentials."], ["postMessage", "Immer event.origin gegen Allowlist prüfen + targetOrigin setzen — niemals \"*\" produktiv."], ["Rate Limit", "60 req/min pro Welt (Key) bzw. pro JWT-sub; Überschreitung → 429 DJN-429 + Retry-After."]].map(([k, v]) => (
              <div key={k} className="rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--surface2)" }}><Lock size={12} style={gold} /> <b>{k}</b><br /><span style={{ color: "var(--muted)" }}>{v}</span></div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section id="ws" className={`${panel} lg:col-span-2`} style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2"><Radio size={18} style={gold} /><h2 className={h2}>6 · WebSocket</h2></div>
            <p className="mono mt-2 text-[12px]">ws://localhost:9090/djinn</p>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Realtime-Sync aller Welten. Nachrichtenformat = Event-Schema (id, type, source, timestamp, version, payload).</p>
            <div className="mt-3">{codeBlock("subscribe.json", `{\n  "action": "subscribe",\n  "topics": ["state", "aura", "dr", "gate",\n    "economy", "omega", "q9", "ampel",\n    "uni", "config", "bridge"]\n}\n// Kanäle: djinn/state · djinn/aura · djinn/dr\n// djinn/gate · djinn/economy · djinn/omega …`)}</div>
            <div className="mono mt-3 flex flex-wrap gap-1.5 text-[10px]">
              {["state", "aura", "dr", "gate", "economy", "omega", "q9", "ampel", "uni", "config", "bridge"].map((t) => (
                <span key={t} className="rounded-full border px-2 py-0.5" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>djinn/{t}</span>
              ))}
            </div>
          </section>

          <section id="tester" className={`${panel} lg:col-span-3`} style={{ borderColor: "var(--gold-dim)", background: "var(--surface)" }}>
            <div className="flex flex-wrap items-center gap-2"><Activity size={18} style={gold} /><h2 className={h2}>7 · Interactive Tester</h2><span className="mono text-[11px]" style={{ color: "var(--muted)" }}>lokaler Mock · Backend: {backend} · gespeicherte Testläufe: {savedRuns}</span></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="mono block text-[11px]" style={{ color: "var(--muted)" }}>PATCH /state — Dr (MORPH-EDIT)
                  <div className="mt-1.5 flex gap-1.5">{[81, 27, 9, 3, 0].map((d) => (
                    <button key={d} onClick={() => setFDr(d)} className="mono flex-1 rounded-lg py-2 text-sm font-bold" style={fDr === d ? { background: "var(--gold)", color: "#000" } : { border: "1px solid var(--line)" }}>{d}</button>
                  ))}</div>
                </div>
                <label className="mono block text-[11px]" style={{ color: "var(--muted)" }}>Aura (Nutzraum) — {fAura.toFixed(2)}
                  <input type="range" min={0} max={1} step={0.01} value={fAura} onChange={(e) => setFAura(+e.target.value)} className="w-full accent-[#ffd700]" />
                </label>
                <div className="mono block text-[11px]" style={{ color: "var(--muted)" }}>Ampel (WILLKLICK)
                  <div className="mt-1.5 flex gap-1.5">{([["GRUEN", "var(--green)"], ["GELB", "var(--amber)"], ["ROT", "var(--red)"]] as [string, string][]).map(([a, c]) => (
                    <button key={a} onClick={() => setFAmpel(a)} className="mono flex-1 rounded-lg py-2 text-xs font-bold" style={fAmpel === a ? { background: c, color: "#000" } : { border: "1px solid var(--line)", color: c }}>{a}</button>
                  ))}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="mono block text-[11px]" style={{ color: "var(--muted)" }}>FPS<input type="number" value={fFps} onChange={(e) => setFFps(+e.target.value)} className="mono mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} /></label>
                  <label className="mono block text-[11px]" style={{ color: "var(--muted)" }}>GOOD (0–100)<input type="number" value={fGood} onChange={(e) => setFGood(+e.target.value)} className="mono mt-1 w-full rounded-lg border bg-transparent px-2 py-1.5 text-sm" style={{ borderColor: "var(--line)" }} /></label>
                </div>
                <div className="mono block text-[11px]" style={{ color: "var(--muted)" }}>Idempotency-Key (UUID v4)
                  <span className="mt-1 flex gap-1.5"><input readOnly value={idemKey} className="mono w-full truncate rounded-lg border bg-transparent px-2 py-1.5 text-[11px]" style={{ borderColor: "var(--line)" }} />
                  <button onClick={() => setIdemKey(uuid())} className="mono shrink-0 rounded-lg border px-2 text-[11px]" style={{ borderColor: "var(--line)", color: "var(--gold)" }}>neu</button></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applyPatch({ Dr: fDr, aura: fAura, ampel: fAmpel, fps: fFps, good: fGood })} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-black" style={{ background: "var(--gold)" }}><Play size={14} /> PATCH senden</button>
                  <button onClick={() => { setState({ ...DEFAULTS }); setIdemKey(uuid()); idemStore.current.clear(); setLog((l) => ["STATE_RESET ← bridge → Defaults wiederhergestellt", ...l].slice(0, 9)); }} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line)" }}><RotateCcw size={14} /> Reset</button>
                </div>
                <p className="mono text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>Tipp: PATCH senden, dann einen Wert ändern und mit demselben Key erneut senden → 409. ECONOMY rechnet Ω/Q9 automatisch nach, die Gate-Engine entscheidet live.</p>
              </div>
              <div>
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "#040a16" }}>
                  <div className="mono flex items-center justify-between text-[11px]"><span style={{ color: "var(--muted)" }}>GLOBAL_STATE</span>
                    <span className="rounded-full px-2 py-0.5 font-bold" style={state.gate ? { background: "var(--green)", color: "#000" } : { background: "var(--red)", color: "#000" }}>GATE {state.gate ? "OPEN" : "CLOSED"}</span></div>
                  <div className="mono mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                    {(Object.entries(state) as [string, string | number | boolean][]).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-dashed py-0.5" style={{ borderColor: "var(--line)" }}><span style={{ color: "var(--muted)" }}>{k}</span><b style={k === "ampel" ? { color: v === "GRUEN" ? "var(--green)" : v === "GELB" ? "var(--amber)" : "var(--red)" } : gold}>{String(v)}</b></div>
                    ))}
                  </div>
                  <p className="mono mt-2 text-[10px]" style={{ color: "var(--muted)" }}>Ω = aura·0.5 + (Dr/81)·0.3 + ampel(0.2/0.1/0) · Gate: Ω≥0.42 ∧ FPS≥60 ∧ GOOD≥79.84</p>
                  <button onClick={() => copyText(JSON.stringify(state, null, 2), setCopied, "state")} className="mono mt-2 flex items-center gap-1 text-[11px]" style={gold}>{copied === "state" ? <Check size={12} /> : <Copy size={12} />} State kopieren</button>
                </div>
                <div className="mono mt-3 max-h-44 space-y-1 overflow-y-auto rounded-xl border p-3 text-[10px] leading-relaxed" style={{ borderColor: "var(--line)", background: "#040a16", color: "var(--muted)" }}>
                  {log.map((l, i) => <p key={i} style={l.startsWith("✕") ? { color: "var(--red)" } : undefined}>{l}</p>)}
                </div>
              </div>
            </div>
          </section>
        </div>

        <footer className="mono mt-10 flex flex-wrap items-center gap-3 border-t pt-5 text-[11px]" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
          <FileCode2 size={13} style={gold} /> cycOS DJINN API Specification v1.0 · OpenAPI 3.1.0 · Single-File-Doku (file://-sicher) · Q9 19683
          <span className="ml-auto flex gap-3">
            <button onClick={() => download("openapi.yaml", OPENAPI_YAML, "text/yaml")} style={gold}>↓ YAML</button>
            <button onClick={() => download("openapi.json", OPENAPI_JSON, "application/json")} style={gold}>↓ JSON</button>
            <button onClick={() => download("events-registry.json", REGISTRY_JSON, "application/json")} style={gold}>↓ Registry</button>
          </span>
        </footer>
      </main>
    </div>
  );
}
