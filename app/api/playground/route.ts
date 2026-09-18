import { NextRequest, NextResponse } from "next/server";
import vm from "node:vm";
import { transpileModule, ModuleKind, ScriptTarget } from "typescript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Execution is backed by Compiler Explorer (Godbolt) — free, no API key.
// https://godbolt.org/api/docs
const GODBOLT = process.env.GODBOLT_API_URL || "https://godbolt.org";

// In-memory per-IP rate limit for this relay (protects Godbolt quota and
// local compute; authenticated backend exec has its own server-side limits).
const PLAYGROUND_BUCKET = new Map<string, number[]>();
const PLAYGROUND_MAX = 60;
const PLAYGROUND_WINDOW_MS = 60 * 60 * 1000;

function playgroundRateLimited(req: NextRequest): boolean {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const hits = (PLAYGROUND_BUCKET.get(ip) || []).filter((t) => t > now - PLAYGROUND_WINDOW_MS);
    if (hits.length >= PLAYGROUND_MAX) {
      PLAYGROUND_BUCKET.set(ip, hits);
      return true;
    }
    hits.push(now);
    PLAYGROUND_BUCKET.set(ip, hits);
    if (PLAYGROUND_BUCKET.size > 5000) PLAYGROUND_BUCKET.clear();
    return false;
  } catch {
    return false;
  }
}
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent": "DevIQ-Playground/1.0 (+https://www.deviq.online)",
};

// Languages executed remotely via Godbolt. `patterns` are tried in order;
// within each pattern the highest-numbered compiler id wins (latest toolchain).
const REMOTE_LANGUAGES: Record<
  string,
  { godboltLang: string; patterns: RegExp[] }
> = {
  c: { godboltLang: "c", patterns: [/^cg(\d+)$/] },
  cpp: { godboltLang: "c++", patterns: [/^g(\d+)$/] },
  go: { godboltLang: "go", patterns: [/^gl(\d+)$/] },
  rust: { godboltLang: "rust", patterns: [/^r(\d+)$/] },
  java: { godboltLang: "java", patterns: [/^java(\d+)$/] },
  kotlin: { godboltLang: "kotlin", patterns: [/^kotlinc(\d+)$/] },
  csharp: { godboltLang: "csharp", patterns: [/^dotnet(\d+)csharpcoreclr$/] },
  ruby: { godboltLang: "ruby", patterns: [/^ruby(\d+)$/] },
  // Server-side fallback for Python when the browser Pyodide runtime
  // can't load (offline CDN etc.). MicroPython lacks some stdlib modules.
  python: {
    godboltLang: "python",
    patterns: [/^pypy(\d+)$/, /^python(\d+)$/, /^micropython(\d+)$/],
  },
};

const SUPPORTED = ["typescript", ...Object.keys(REMOTE_LANGUAGES)];

interface CompilerInfo {
  id: string;
  name: string;
  lang: string;
}

/** Keep filenames safe: plain basename, no paths, no traversal. */
function sanitizeFilename(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const base = raw.trim().split(/[\\/]/).pop() ?? "";
  if (!/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z0-9]{1,10}$/.test(base)) return null;
  if (base.length > 64) return null;
  return base;
}

/**
 * Godbolt always compiles Java as example.java, so `public class X` only
 * runs if we adapt it. When there is exactly one top-level public class and
 * the requested filename matches it (or no filename was given), drop the
 * `public` modifier for the sandbox run — identical runtime semantics for a
 * single-file program. Otherwise send the code untouched so the genuine
 * javac error surfaces, plus a hint telling the user which filename to use.
 */
function prepareJavaForSandbox(
  code: string,
  filename: string | null
): { code: string; hint: string | null } {
  const names = [
    ...new Set(
      [...code.matchAll(/public\s+(?:abstract\s+|final\s+|static\s+|sealed\s+|non-sealed\s+)*class\s+([A-Za-z_]\w*)/g)].map(
        (m) => m[1]
      )
    ),
  ];
  if (names.length !== 1) return { code, hint: null };
  const className = names[0];
  const base = filename?.replace(/\.java$/i, "");
  if (base && base !== className) {
    return {
      code,
      hint: `Note: public class ${className} must be declared in a file named ${className}.java — rename the file to ${className}.java to run this program.`,
    };
  }
  const adapted = code.replace(
    new RegExp(`public\\s+((?:abstract\\s+|final\\s+|static\\s+|sealed\\s+|non-sealed\\s+)*class\\s+${className}\\b)`),
    "$1"
  );
  return { code: adapted, hint: null };
}

let compilerCache: { at: number; list: CompilerInfo[] } | null = null;

async function getCompilers(): Promise<CompilerInfo[]> {
  if (compilerCache && Date.now() - compilerCache.at < 60 * 60 * 1000) {
    return compilerCache.list;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${GODBOLT}/api/compilers`, {
      headers: { Accept: "application/json", "User-Agent": HEADERS["User-Agent"] },
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`compiler list unavailable (${r.status})`);
    const list = (await r.json()) as CompilerInfo[];
    compilerCache = { at: Date.now(), list };
    return list;
  } finally {
    clearTimeout(t);
  }
}

function pickCompilers(list: CompilerInfo[], language: string): CompilerInfo[] {
  const spec = REMOTE_LANGUAGES[language];
  const out: CompilerInfo[] = [];
  for (const re of spec.patterns) {
    const matches = list
      .filter((c) => c.lang === spec.godboltLang && re.test(c.id))
      .map((c) => ({ c, n: parseInt(c.id.match(re)![1], 10) }))
      .filter((x) => Number.isFinite(x.n))
      .sort((a, b) => b.n - a.n)
      .map((x) => x.c);
    for (const m of matches) {
      if (!out.some((o) => o.id === m.id)) out.push(m);
      if (out.length >= 3) break;
    }
    if (out.length >= 3) break;
  }
  return out.slice(0, 3);
}

interface GodboltLine {
  text: string;
}

async function executeOnGodbolt(
  compilerId: string,
  godboltLang: string,
  code: string,
  stdin: string
): Promise<{
  stdout: string;
  stderr: string;
  compile_output: string;
  exit_code: number | null;
  compilerName: string;
  time_ms: number | null;
}> {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(`${GODBOLT}/api/compiler/${compilerId}/compile`, {
      method: "POST",
      headers: HEADERS,
      signal: ctrl.signal,
      body: JSON.stringify({
        source: code,
        compiler: compilerId,
        lang: godboltLang,
        allowStoreCodeDebug: true,
        options: {
          userOptions: "",
          compilerOptions: { executorRequest: true, skipAsm: true },
          executeParameters: { args: "", stdin, runtimeTools: [] },
          filters: { execute: true },
          tools: [],
          libraries: [],
        },
      }),
    });
    if (!r.ok) throw new Error(`execution backend error (${r.status})`);
    const data = await r.json();
    // Godbolt emits ANSI colour codes — strip them for clean UI display.
    const join = (arr: GodboltLine[] | undefined) =>
      (arr || [])
        .map((l) => l.text ?? "")
        .join("\n")
        // eslint-disable-next-line no-control-regex
        .replace(/\u001b\[[0-9;]*[A-Za-z]/g, "");
    const buildErr = join(data?.buildResult?.stderr);
    if (!data?.didExecute) {
      return {
        stdout: join(data?.stdout),
        stderr: join(data?.stderr) || "Execution is not available for this compiler right now.",
        compile_output: buildErr,
        exit_code: typeof data?.code === "number" ? data.code : 1,
        compilerName: compilerId,
        time_ms: Date.now() - t0,
      };
    }
    return {
      stdout: join(data?.stdout),
      stderr: join(data?.stderr),
      compile_output: buildErr,
      exit_code: typeof data?.code === "number" ? data.code : null,
      compilerName: compilerId,
      time_ms: Date.now() - t0,
    };
  } finally {
    clearTimeout(t);
  }
}

/** TypeScript: strip types with the TS compiler, then run the JS in a
 *  locked-down Node vm (no require/process/fs access) with a timeout. */
async function executeTypeScript(
  code: string,
  stdin: string
): Promise<{ stdout: string; stderr: string; exit_code: number; time_ms: number }> {
  const t0 = Date.now();
  let js: string;
  try {
    js = transpileModule(code, {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        target: ScriptTarget.ES2020,
      },
      reportDiagnostics: false,
    }).outputText;
  } catch (e) {
    return {
      stdout: "",
      stderr: `TypeScript transpile error: ${e instanceof Error ? e.message : String(e)}`,
      exit_code: 1,
      time_ms: Date.now() - t0,
    };
  }

  const logs: string[] = [];
  const fmt = (args: unknown[]) =>
    args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a, null, 2) ?? String(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
  const sandboxConsole = {
    log: (...args: unknown[]) => void logs.push(fmt(args)),
    info: (...args: unknown[]) => void logs.push(fmt(args)),
    warn: (...args: unknown[]) => void logs.push(`⚠ ${fmt(args)}`),
    error: (...args: unknown[]) => void logs.push(`✖ ${fmt(args)}`),
  };
  // No require/module/process/fs in scope — user code gets console only.
  // prompt(msg?) reads one stdin line per call, like a terminal.
  const inputLines = stdin.split("\n");
  const stdinEmpty = inputLines.length === 1 && inputLines[0] === "";
  let lineIdx = 0;
  const takeLine = (): string => {
    if (stdinEmpty || lineIdx >= inputLines.length) return "";
    return inputLines[lineIdx++];
  };
  const sandboxPrompt = (msg?: unknown): string => {
    if (msg !== undefined) logs.push(String(msg));
    return takeLine();
  };
  const sandbox = { console: sandboxConsole, prompt: sandboxPrompt };
  try {
    const result = vm.runInNewContext(
      `(async () => {\n${js}\n})()`,
      sandbox,
      { timeout: 8000 }
    );
    await Promise.race([
      Promise.resolve(result),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timed out after 8s (infinite loop?)")), 9000)
      ),
    ]);
    return { stdout: logs.join("\n"), stderr: "", exit_code: 0, time_ms: Date.now() - t0 };
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return {
      stdout: logs.join("\n"),
      stderr: msg,
      exit_code: 1,
      time_ms: Date.now() - t0,
    };
  }
}

export async function GET() {
  return NextResponse.json({
    supported: SUPPORTED,
    notes: {
      javascript: "executed instantly in the browser (no server round-trip)",
      python: "executed in the browser via Pyodide; server fallback available",
      java: "optional filename supported (e.g. Calculator.java); public class X runs when the filename is X.java",
    },
    engine: "godbolt",
  });
}

export async function POST(req: NextRequest) {
  if (playgroundRateLimited(req)) {
    return NextResponse.json(
      { error: "Too many executions, please slow down" },
      { status: 429 }
    );
  }
  let body: { language?: string; code?: string; stdin?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const languageKey = (body.language || "").toLowerCase().trim();
  const code = typeof body.code === "string" ? body.code : "";
  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  const filename = sanitizeFilename(body.filename);

  if (!SUPPORTED.includes(languageKey)) {
    return NextResponse.json(
      {
        error: `Unsupported language: ${body.language || "(none)"}`,
        supported: SUPPORTED,
      },
      { status: 400 }
    );
  }
  if (!code.trim()) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }
  if (code.length > 100_000) {
    return NextResponse.json({ error: "Code too large (max 100KB)" }, { status: 400 });
  }
  if (stdin.length > 20_000) {
    return NextResponse.json({ error: "stdin too large (max 20KB)" }, { status: 400 });
  }

  if (languageKey === "typescript") {
    const res = await executeTypeScript(code, stdin);
    return NextResponse.json({
      language: languageKey,
      runtime: "typescript (transpiled, sandboxed)",
      stdout: res.stdout,
      stderr: res.stderr,
      compile_output: "",
      exit_code: res.exit_code,
      signal: null,
      time_ms: res.time_ms,
    });
  }

  // Remote execution via Godbolt with compiler fallback.
  try {
    const list = await getCompilers();
    const candidates = pickCompilers(list, languageKey);
    if (candidates.length === 0) {
      return NextResponse.json(
        { error: `No execution toolchain available for ${languageKey} right now` },
        { status: 502 }
      );
    }
    // Java: Godbolt compiles as example.java, so adapt `public class X`
    // for the sandbox (see prepareJavaForSandbox).
    let execCode = code;
    let javaHint: string | null = null;
    if (languageKey === "java") {
      const prepared = prepareJavaForSandbox(code, filename);
      execCode = prepared.code;
      javaHint = prepared.hint;
    }
    let lastError = "unknown error";
    for (const c of candidates) {
      try {
        const res = await executeOnGodbolt(
          c.id,
          REMOTE_LANGUAGES[languageKey].godboltLang,
          execCode,
          stdin
        );
        const compile_output = javaHint
          ? [res.compile_output, javaHint].filter(Boolean).join("\n")
          : res.compile_output;
        return NextResponse.json({
          language: languageKey,
          filename: filename ?? null,
          runtime: `${c.name} (${c.id})`,
          stdout: res.stdout,
          stderr: res.stderr,
          compile_output,
          exit_code: res.exit_code,
          signal: null,
          time_ms: res.time_ms,
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    return NextResponse.json(
      { error: `Execution failed: ${lastError}` },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: `Execution error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 }
    );
  }
}
