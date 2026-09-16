"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Monaco (the VS Code editor) is heavy, so it loads only on this page,
// never in the main bundle.
const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#888",
      }}
    >
      Loading VS Code editor…
    </div>
  ),
});

// Minimal theme shape — compatible with DevIQ's Theme objects in app/page.tsx
export interface PlaygroundTheme {
  bg: string;
  bgAlt: string;
  surface: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  text3: string;
  accent: string;
  accentFg: string;
  blue: string;
  blueLight: string;
  blueBorder: string;
  amber: string;
  amberLight: string;
  amberBorder: string;
  rose: string;
  roseLight: string;
  roseBorder: string;
  purple: string;
  purpleLight: string;
  purpleBorder: string;
  green: string;
  greenLight: string;
  greenBorder: string;
  teal: string;
  track: string;
  shadow: string;
  shadowMd: string;
  shadowLg: string;
}

type RunStatus = "idle" | "running" | "success" | "error";

interface RunResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  exit_code: number | null;
  runtime?: string;
  time_ms?: number | null;
  local?: boolean;
}

/** One terminal transcript row. */
type TLineKind = "cmd" | "out" | "err" | "warn" | "in" | "sys";
interface TLine {
  id: number;
  kind: TLineKind;
  text: string;
}

/** Displayed run command per language (cosmetic, like a real shell). */
const RUN_CMD: Record<string, string> = {
  javascript: "node",
  typescript: "ts-node",
  python: "python3",
  java: "java",
  c: "./a.out",
  cpp: "./a.out",
  go: "go run",
  rust: "./main",
  ruby: "ruby",
  csharp: "dotnet run",
  kotlin: "kotlin",
};

interface LanguageDef {
  id: string;
  label: string;
  extension: string;
  piston: boolean; // false => executed locally in browser
  defaultCode: string;
}

const LANGUAGES: LanguageDef[] = [
  {
    id: "javascript",
    label: "JavaScript",
    extension: "js",
    piston: false,
    defaultCode: `// Write JavaScript directly in DevIQ — runs instantly in your browser.\nconsole.log("Hello from DevIQ Playground!");\n\nfunction fibonacci(n) {\n  return n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nfor (let i = 0; i < 8; i++) {\n  console.log(\`fib(\${i}) = \${fibonacci(i)}\`);\n}`,
  },
  {
    id: "typescript",
    label: "TypeScript",
    extension: "ts",
    piston: true,
    defaultCode: `// TypeScript is type-checked, stripped to JavaScript,\n// then run in a secure sandbox.\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nconst langs: string[] = ["TypeScript", "Python", "Java", "Go"];\nlangs.forEach((l) => console.log(greet(l)));`,
  },
  {
    id: "python",
    label: "Python",
    extension: "py",
    piston: true,
    defaultCode: `# Python runs instantly in your browser (Pyodide).\n# input() reads from the terminal below.\nprint("Hello from DevIQ Playground!")\n\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=" ")\n        a, b = b, a + b\n\nfibonacci(10)\nprint()`,
  },
  {
    id: "java",
    label: "Java",
    extension: "java",
    piston: true,
    defaultCode: `// Name this file above (e.g. Calculator.java) — it must\n// match your public class name to run.\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from DevIQ Playground!");\n        for (int i = 0; i < 5; i++) {\n            System.out.println("Count: " + i);\n        }\n    }\n}`,
  },
  {
    id: "c",
    label: "C",
    extension: "c",
    piston: true,
    defaultCode: `#include <stdio.h>\n\nint main() {\n    printf("Hello from DevIQ Playground!\\n");\n    for (int i = 0; i < 5; i++) {\n        printf("Count: %d\\n", i);\n    }\n    return 0;\n}`,
  },
  {
    id: "cpp",
    label: "C++",
    extension: "cpp",
    piston: true,
    defaultCode: `#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "Hello from DevIQ Playground!" << std::endl;\n    std::vector<int> nums = {1, 2, 3, 4, 5};\n    for (int n : nums) std::cout << n * n << " ";\n    std::cout << std::endl;\n    return 0;\n}`,
  },
  {
    id: "go",
    label: "Go",
    extension: "go",
    piston: true,
    defaultCode: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from DevIQ Playground!")\n    for i := 0; i < 5; i++ {\n        fmt.Printf("Count: %d\\n", i)\n    }\n}`,
  },
  {
    id: "rust",
    label: "Rust",
    extension: "rs",
    piston: true,
    defaultCode: `fn main() {\n    println!("Hello from DevIQ Playground!");\n    let squares: Vec<i32> = (1..=5).map(|x| x * x).collect();\n    println!("{:?}", squares);\n}`,
  },
  {
    id: "ruby",
    label: "Ruby",
    extension: "rb",
    piston: true,
    defaultCode: `puts "Hello from DevIQ Playground!"\n5.times { |i| puts "Count: #{i}" }`,
  },
  {
    id: "csharp",
    label: "C#",
    extension: "cs",
    piston: true,
    defaultCode: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from DevIQ Playground!");\n        for (int i = 0; i < 5; i++)\n            Console.WriteLine($"Count: {i}");\n    }\n}`,
  },
  {
    id: "kotlin",
    label: "Kotlin",
    extension: "kt",
    piston: true,
    defaultCode: `fun main() {\n    println("Hello from DevIQ Playground!")\n    for (i in 0 until 5) println("Count: $i")\n}`,
  },
];

/** Languages backed by the live interactive runner (mid-run prompts work).
 *  JavaScript stays fully local; the rest fall back to batch when offline. */
const LIVE_LANGS = ["javascript", "python", "typescript", "java", "c", "cpp", "go"];

/** Direct backend origin — prefer the new Render service.
 *  If the env still points at the old bu76 host (Vercel env cache), force
 *  the new host so Java/Go live sessions work. */
const RAW_BACKEND_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://deviq-backend-x6a9.onrender.com";
const BACKEND_BASE = (
  RAW_BACKEND_BASE.includes("developer-portfolio-backend-bu76")
    ? "https://deviq-backend-x6a9.onrender.com"
    : RAW_BACKEND_BASE
).replace(/\/$/, "");

/** How each language reads a line from stdin (shown in the terminal hint). */
const INPUT_HINT: Record<string, string> = {
  javascript: "prompt()",
  typescript: "prompt()",
  python: "input()",
  java: "new Scanner(System.in)",
  c: "scanf()",
  cpp: "std::cin",
  go: "fmt.Scan()",
  rust: "io::stdin().read_line()",
  ruby: "gets",
  csharp: "Console.ReadLine()",
  kotlin: "readLine()",
};

/** Patterns showing the program reads from stdin. Used to hint inside the
 *  terminal when nothing was typed yet so programs don't silently see EOF. */
const READS_STDIN: Record<string, RegExp[]> = {
  javascript: [/\bprompt\s*\(/],
  typescript: [/\bprompt\s*\(/],
  python: [/\binput\s*\(/, /\bsys\.stdin\b/],
  java: [/new\s+Scanner\s*\(\s*System\.in/, /\bSystem\.in\b/],
  c: [/\bscanf\s*\(/, /\bgetchar\s*\(/, /\bfgets\s*\(/],
  cpp: [/std::cin\s*>>|cin\s*>>/, /getline\s*\(\s*(std::)?cin/, /\bscanf\s*\(/],
  go: [/fmt\.Scan/, /bufio\.\w*Reader/, /\bos\.Stdin\b/],
  rust: [/io::stdin/, /read_line\s*\(/],
  ruby: [/(^|[^\w.])gets\b/, /\bSTDIN\b/],
  csharp: [/Console\.ReadLine\s*\(/, /Console\.In\b/],
  kotlin: [/\breadLine\s*\(\s*\)/, /readln\s*\(/],
};

export function readsStdin(code: string, language: string): boolean {
  const rules = READS_STDIN[(language || "").toLowerCase()];
  if (!rules) return false;
  // Ignore matches inside comments (rough scan; detection only).
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1")
    .replace(/^[ \t]*#[^\n]*/gm, "")
    .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '""');
  return rules.some((re) => re.test(stripped));
}

function storageKey(lang: string) {
  return `deviq_playground_${lang}`;
}

function stdinKey(lang: string) {
  return `deviq_stdin_${lang}`;
}

/** Run JavaScript locally in the browser with console capture.
 *  `prompt(msg?)` is shimmed to read lines from the terminal, so every
 *  language — including JS — can take input from the same place. */
/** Live I/O bridge between a locally-run program and the terminal UI. */
export interface LocalRunIO {
  /** Synchronously consume one queued terminal line (null when empty). */
  takeLine: () => string | null;
  /** Wait for the next line submitted in the terminal (truly interactive). */
  waitLine: () => Promise<string>;
  /** Stream a line to the terminal transcript. */
  print: (text: string) => void;
  printErr: (text: string) => void;
  /** True while suspended on waitLine (drives the waiting indicator). */
  setWaiting: (w: boolean) => void;
}

/** Run JavaScript locally in the browser with console capture.
 *  `prompt(msg?)` consumes queued terminal lines; `await input(msg?)`
 *  genuinely waits for the user to type in the terminal mid-run. */
export async function runJavaScriptLocally(code: string, io: LocalRunIO): Promise<RunResult> {
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
  const emit = (text: string) => {
    logs.push(text);
    io.print(text);
  };

  const sandboxConsole = {
    log: (...args: unknown[]) => void emit(fmt(args)),
    info: (...args: unknown[]) => void emit(fmt(args)),
    warn: (...args: unknown[]) => void emit(`⚠ ${fmt(args)}`),
    error: (...args: unknown[]) => void emit(`✖ ${fmt(args)}`),
    table: (data: unknown) => {
      try {
        emit(JSON.stringify(data, null, 2) ?? String(data));
      } catch {
        emit(String(data));
      }
    },
    clear: () => void logs.length,
  };

  const sandboxPrompt = (msg?: unknown): string => {
    if (msg !== undefined) emit(String(msg));
    return io.takeLine() ?? "";
  };
  const t0 = performance.now();
  let waiting = false;
  const setWaitingBoth = (w: boolean) => {
    waiting = w;
    io.setWaiting(w);
  };
  // input() suspends until the user submits a line in the terminal.
  const sandboxInputTracked = async (msg?: unknown): Promise<string> => {
    if (msg !== undefined) emit(String(msg));
    setWaitingBoth(true);
    try {
      return await io.waitLine();
    } finally {
      setWaitingBoth(false);
    }
  };
  try {
    // Wrap in async function so top-level await works.
    const fn = new Function(
      "console",
      "prompt",
      "input",
      `"use strict";\nreturn (async () => {\n${code}\n})();`
    );
    // Wait-aware timeout: plain code gets 5s; a program suspended on
    // input() may wait up to 120s for the user.
    const BASE_MS = 5000;
    const MAX_MS = 120000;
    await new Promise<void>((resolve, reject) => {
      const t = setInterval(() => {
        const elapsed = Date.now() - t0;
        if (!waiting && elapsed > BASE_MS) {
          clearInterval(t);
          reject(new Error("Timed out after 5s (infinite loop?)"));
        } else if (waiting && elapsed > MAX_MS) {
          clearInterval(t);
          reject(new Error("Timed out waiting for input (120s)."));
        }
      }, 250);
      Promise.resolve()
        .then(() => fn(sandboxConsole, sandboxPrompt, sandboxInputTracked))
        .then(
          () => {
            clearInterval(t);
            resolve();
          },
          (e) => {
            clearInterval(t);
            reject(e);
          }
        );
    });
    return {
      stdout: logs.join("\n"),
      stderr: "",
      compile_output: "",
      exit_code: 0,
      runtime: "browser (local)",
      time_ms: Math.round(performance.now() - t0),
      local: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return {
      stdout: logs.join("\n"),
      stderr: msg,
      compile_output: "",
      exit_code: 1,
      runtime: "browser (local)",
      time_ms: Math.round(performance.now() - t0),
      local: true,
    };
  }
}

/* ── Python via Pyodide (CPython compiled to WebAssembly, runs in-browser) ── */
const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";

interface PyodideApi {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  setStdin: (opts: { stdin: () => number | null; isatty?: boolean }) => void;
  loadPackagesFromImports: (code: string) => Promise<void>;
}

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideApi>;
    __deviqPyodide?: Promise<PyodideApi>;
  }
}

function loadPyodideOnce(onStatus: (msg: string) => void): Promise<PyodideApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.__deviqPyodide) return window.__deviqPyodide;
  window.__deviqPyodide = new Promise<PyodideApi>((resolve, reject) => {
    onStatus("Loading Python runtime (one-time download)…");
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${PYODIDE_URL}"]`
    );
    const boot = () => {
      if (!window.loadPyodide) {
        reject(new Error("Python runtime failed to initialise."));
        return;
      }
      window
        .loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" })
        .then(resolve, reject);
    };
    if (existing) {
      if (window.loadPyodide) boot();
      else existing.addEventListener("load", boot, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = PYODIDE_URL;
    s.async = true;
    s.onload = boot;
    s.onerror = () => reject(new Error("Could not download the Python runtime (check your connection)."));
    document.head.appendChild(s);
  });
  return window.__deviqPyodide;
}

async function runPythonLocally(
  code: string,
  io: Pick<LocalRunIO, "takeLine" | "print" | "printErr">,
  onStatus: (msg: string) => void
): Promise<RunResult> {
  const t0 = performance.now();
  const py = await loadPyodideOnce(onStatus);
  const out: string[] = [];
  const err: string[] = [];
  py.setStdout({
    batched: (s) => {
      out.push(s);
      io.print(s);
    },
  });
  py.setStderr({
    batched: (s) => {
      err.push(s);
      io.printErr(s);
    },
  });
  // input() consumes queued terminal lines one per call. Pyodide cannot
  // suspend for mid-run typing, so lines must be typed before they are
  // needed; exhausted input raises EOFError, like a real terminal at EOF.
  let charBuf: string[] = [];
  py.setStdin({
    isatty: false,
    stdin: () => {
      if (charBuf.length === 0) {
        const line = io.takeLine();
        if (line === null) return null; // EOF -> input() raises EOFError
        charBuf = `${line}\n`.split("");
      }
      return charBuf.shift()!.charCodeAt(0);
    },
  });
  try {
    await py.loadPackagesFromImports(code);
  } catch {
    /* best-effort: missing packages will surface as ImportError below */
  }
  try {
    await py.runPythonAsync(code);
    return {
      stdout: out.join("\n"),
      stderr: err.join("\n"),
      compile_output: "",
      exit_code: err.length > 0 ? 1 : 0,
      runtime: "pyodide (browser)",
      time_ms: Math.round(performance.now() - t0),
      local: true,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      stdout: out.join("\n"),
      stderr: [err.join("\n"), msg].filter(Boolean).join("\n"),
      compile_output: "",
      exit_code: 1,
      runtime: "pyodide (browser)",
      time_ms: Math.round(performance.now() - t0),
      local: true,
    };
  }
}

export default function PlaygroundPage({
  tk,
  isMobile,
  dark,
}: {
  tk: PlaygroundTheme;
  isMobile: boolean;
  dark: boolean;
}) {
  const [language, setLanguage] = useState("javascript");
  const langDef = useMemo(
    () => LANGUAGES.find((l) => l.id === language) ?? LANGUAGES[0],
    [language]
  );
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const defaultFilename = (langId: string, ext: string) =>
    langId === "java" ? "Main.java" : `main.${ext}`;
  const [filename, setFilename] = useState(
    defaultFilename(LANGUAGES[0].id, LANGUAGES[0].extension)
  );
  const [filenameTouched, setFilenameTouched] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [termCopied, setTermCopied] = useState(false);
  // Dedicated stdin box: one input line per row, fed in order.
  const [stdinText, setStdinText] = useState("");
  const [elapsed, setElapsed] = useState(0);

  /* ── Terminal state ── */
  const [transcript, setTranscript] = useState<TLine[]>([]);
  const [termInput, setTermInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const queueRef = useRef<string[]>([]);
  const waitersRef = useRef<((line: string) => void)[]>([]);
  const tId = useRef(0);
  const termScrollRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);

  /* ── Interactive runner session (live process on the backend) ── */
  const sessionRef = useRef<{ id: string } | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  // Live-runner reachability: checked on mount, cached 60s, click dot to re-check.
  const [runner, setRunner] = useState<{ ok: boolean; langs: string[]; at: number } | null>(null);
  const runnerRef = useRef<{ ok: boolean; langs: string[]; at: number } | null>(null);
  const offRef = useRef({ so: 0, se: 0 });
  const remOutRef = useRef("");
  const remErrRef = useRef("");
  const [pendingOut, setPendingOut] = useState("");
  const [pendingErr, setPendingErr] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef(false);

  const pushT = useCallback((kind: TLineKind, text: string) => {
    const id = ++tId.current;
    setTranscript((prev) => {
      const next = [...prev, { id, kind, text }];
      return next.length > 2000 ? next.slice(next.length - 2000) : next;
    });
  }, []);

  // Auto-scroll the terminal as output arrives.
  useEffect(() => {
    const el = termScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, pendingOut, pendingErr]);

  // When a running program asks for input, bring focus to the terminal line.
  useEffect(() => {
    if (waiting) termInputRef.current?.focus({ preventScroll: true });
  }, [waiting]);

  /** Submit a line typed in the terminal. With a live runner session it is
   *  streamed straight into the running program's stdin; otherwise it
   *  resolves a waiting local program first, or is queued for the next read. */
  const submitTermLine = useCallback(
    (raw: string) => {
      const line = raw.replace(/\r$/, "");
      const sess = sessionRef.current;
      if (sess) {
        // Real-terminal echo: when the program left a prompt without a
        // trailing newline ("Enter your name: "), keystrokes land on that
        // same line. Otherwise (typeahead) they echo on their own line.
        if (remOutRef.current !== "") {
          const merged = remOutRef.current + line;
          remOutRef.current = "";
          setPendingOut("");
          pushT("out", merged);
        } else {
          pushT("in", line);
        }
        void (async () => {
          try {
            const res = await postExec("/input", { session_id: sess.id, line }, 8000);
            if (!res.ok) pushT("err", res.data?.error || "Runner rejected the input.");
          } catch {
            pushT("err", "Could not reach the runner.");
          }
        })();
        return;
      }
      pushT("in", line);
      const waiter = waitersRef.current.shift();
      if (waiter) {
        if (waitersRef.current.length === 0) setWaiting(false);
        waiter(line);
      } else {
        queueRef.current.push(line);
      }
    },
    [pushT]
  );

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted code + stdin when language changes.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(language));
      setCode(saved ?? langDef.defaultCode);
    } catch {
      setCode(langDef.defaultCode);
    }
    try {
      setStdinText(localStorage.getItem(stdinKey(language)) ?? "");
    } catch {
      setStdinText("");
    }
    setFilename(defaultFilename(language, langDef.extension));
    setFilenameTouched(false);
    setResult(null);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Persist code edits (debounced via effect).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(language), code);
      } catch {
        /* storage full / private mode — ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [code, language]);

  // Persist stdin edits (debounced via effect).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(stdinKey(language), stdinText);
      } catch {
        /* storage full / private mode — ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [stdinText, language]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-name Java files from the public class (until the user edits it).
  useEffect(() => {
    if (language !== "java" || filenameTouched) return;
    const names = [
      ...new Set(
        [...code.matchAll(/public\s+(?:abstract\s+|final\s+|static\s+)*class\s+([A-Za-z_]\w*)/g)].map(
          (m) => m[1]
        )
      ),
    ];
    if (names.length === 1) {
      const want = `${names[0]}.java`;
      if (want !== filename) setFilename(want);
    }
  }, [code, language, filenameTouched, filename]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* ── Live runner session (interactive backend) ── */

  const checkRunner = useCallback(
    async (timeoutMs = 4000): Promise<boolean> => {
      const fetchLangs = async (url: string) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const r = await fetch(url, { signal: ctrl.signal });
          if (!r.ok) throw new Error(`runner check (${r.status})`);
          const ct = r.headers.get("content-type") || "";
          if (!ct.includes("application/json")) throw new Error("not json");
          const d = (await r.json().catch(() => ({}))) as {
            supported?: Record<string, boolean>;
          };
          if (!d.supported || typeof d.supported !== "object") throw new Error("bad payload");
          const supported = d.supported;
          const langs = Object.keys(supported).filter((k) => supported[k]);
          // Empty langs with ok:true is ambiguous (proxy returned html 200) — treat as failure so direct is tried
          if (langs.length === 0 && Object.keys(supported).length === 0) throw new Error("empty supported");
          return { ok: true, langs, at: Date.now() };
        } finally {
          clearTimeout(t);
        }
      };
      // Race direct vs proxy — first valid answer wins. Both hit the same
      // backend, so this is read-only and safe to run in parallel. It cuts
      // the worst case from (direct timeout + proxy timeout) to one timeout.
      try {
        const info = await Promise.any([
          fetchLangs(`${BACKEND_BASE}/exec/languages`),
          fetchLangs("/api/proxy/exec/languages"),
        ]);
        setRunner(info);
        runnerRef.current = info;
        return true;
      } catch {
        const info = { ok: false, langs: [] as string[], at: Date.now() };
        setRunner(info);
        runnerRef.current = info;
        return false;
      }
    },
    []
  );

  // Keep ref in sync when runner changes via UI click
  useEffect(() => {
    runnerRef.current = runner;
  }, [runner]);

  // Warm everything on mount so Run feels instant:
  //  - ping the backend to wake it from Render sleep (long timeout, background)
  //  - probe the runner so the header dot reflects reality
  //  - warm the cloud-sandbox compiler cache on the server
  //  - keep the backend warm while the page stays open (sleeps after ~15m idle)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 55000);
        await fetch(`${BACKEND_BASE}/health`, {
          signal: ctrl.signal,
          mode: "cors",
        }).catch(() => null);
        clearTimeout(t);
      } catch {
        /* wake-up is best-effort; the run path has its own fallbacks */
      }
      if (!cancelled) void checkRunner(6000);
    })();
    // Best-effort warm of the server-side Godbolt compiler list (1h cache).
    fetch("/api/playground").catch(() => null);
    const keepAlive = setInterval(() => {
      fetch(`${BACKEND_BASE}/health`, { mode: "cors" }).catch(() => null);
    }, 8 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(keepAlive);
    };
  }, [checkRunner]);

  // Preload the in-browser Python runtime as soon as Python is selected, so
  // the ~10MB one-time download happens while the user is still typing —
  // not after they hit Run. Silent: failures surface at Run time as usual.
  useEffect(() => {
    if (language !== "python") return;
    const t = setTimeout(() => {
      loadPyodideOnce(() => {}).catch(() => null);
    }, 1200);
    return () => clearTimeout(t);
  }, [language]);

  // NOTE: stateful POSTs (/start, /input) go to exactly ONE path — racing
  // them would create two backend sessions / deliver input twice. Direct
  // first (one fewer hop, no serverless cold start), proxy as fallback.
  const postExec = useCallback(async (path: string, body: unknown, timeoutMs: number) => {
    const doFetch = async (base: string) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const url = base === "/api/proxy" ? `${base}/exec${path}` : `${base}/exec${path}`;
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
          ...(base.startsWith("http") ? { mode: "cors" as RequestMode } : {}),
        });
        const ct = r.headers.get("content-type") || "";
        // GH Pages / Vercel catch-all can return HTML 200 for /api/proxy — treat as missing route
        if (!ct.includes("application/json") && r.ok) throw new Error("proxy returned html");
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data, ct };
      } finally {
        clearTimeout(t);
      }
    };
    let lastErr: unknown = null;
    try {
      return await doFetch(BACKEND_BASE);
    } catch (e) {
      lastErr = e;
    }
    try {
      const viaProxy = await doFetch("/api/proxy");
      if (viaProxy.status !== 404 && (viaProxy as { ct: string }).ct?.includes("application/json")) return viaProxy;
      if (viaProxy.status !== 404 && viaProxy.ok && Object.keys(viaProxy.data).length === 0) throw new Error("empty proxy");
      return viaProxy;
    } catch (e) {
      throw lastErr ?? e;
    }
  }, []);

  /** Append a streamed chunk, splitting off complete lines. Prompts without
   *  a trailing newline ("Enter your name: ") stay visible as pending text. */
  const ingest = useCallback(
    (kind: "out" | "err", chunk: string) => {
      if (!chunk) return;
      const remRef = kind === "out" ? remOutRef : remErrRef;
      const setP = kind === "out" ? setPendingOut : setPendingErr;
      const parts = (remRef.current + chunk).split("\n");
      remRef.current = parts.pop() ?? "";
      setP(remRef.current);
      for (const l of parts) pushT(kind, l.replace(/\r$/, ""));
    },
    [pushT]
  );

  const endSession = useCallback(
    (
      sid: string,
      outcome: "success" | "error",
      startedAt: number,
      last?: { exit_code?: number | null; truncated?: boolean }
    ) => {
      if (sessionRef.current?.id !== sid) return;
      sessionRef.current = null;
      setSessionActive(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (last?.truncated) pushT("sys", "output truncated (256KB cap)");
      if (remOutRef.current !== "") {
        pushT("out", remOutRef.current);
        remOutRef.current = "";
        setPendingOut("");
      }
      if (remErrRef.current !== "") {
        pushT("err", remErrRef.current);
        remErrRef.current = "";
        setPendingErr("");
      }
      setWaiting(false);
      pushT("sys", `exit ${last?.exit_code ?? "?"} · ${Date.now() - startedAt} ms`);
      setStatus(outcome);
      stopTimer();
    },
    [pushT, stopTimer]
  );

  const killSession = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    pushT("sys", "stopping…");
    void (async () => {
      try {
        await postExec("/kill", { session_id: s.id }, 5000);
      } catch {
        /* the poll loop finalizes the run */
      }
    })();
  }, [postExec, pushT]);

  /**
   * Try a live interactive run on the backend. Returns "session" when a live
   * process now owns the run, "handled" when it finished inline (compile
   * error), or null when the backend can't do it — caller falls back to the
   * batch engines (Pyodide / Godbolt) with queued stdin.
   */
  const startInteractive = useCallback(
    async (startedAt: number, boxLines: string[]): Promise<"session" | "handled" | null> => {
      const startOnce = (timeoutMs: number) =>
        postExec("/start", { language, code, filename }, timeoutMs);
      // Cold production compiles (javac on a throttled container) can take
      // ~20s — far longer than a dead-backend connection failure, which
      // throws immediately. So a generous timeout only slows the
      // genuinely-slow case, never the dead-backend case.
      const slowHint = setTimeout(
        () => pushT("sys", "still starting… a cold backend can take ~20s to compile."),
        4000
      );
      let res: Awaited<ReturnType<typeof postExec>>;
      try {
        res = await startOnce(30000);
      } catch (e) {
        clearTimeout(slowHint);
        pushT(
          "sys",
          `live start failed (${e instanceof Error ? e.message : "network error"}) — batch mode (pre-typed stdin only).`
        );
        return null;
      }
      clearTimeout(slowHint);
      const backendDetail = (d: unknown): string => {
        const o = (d ?? {}) as { error?: unknown; message?: unknown };
        if (typeof o.error === "string" && o.error) return o.error;
        if (typeof o.message === "string" && o.message) return o.message;
        return `HTTP ${res.status}`;
      };
      // Busy / just-waking backends deserve one retry instead of an
      // instant fallback — the retry usually lands on a warm backend.
      if (!res.ok && (res.status === 429 || res.status === 502 || res.status === 503)) {
        pushT("sys", `live runner busy (${backendDetail(res.data)}) — retrying once…`);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          res = await startOnce(30000);
        } catch (e) {
          pushT(
            "sys",
            `live retry failed (${e instanceof Error ? e.message : "network error"}) — batch mode (pre-typed stdin only).`
          );
          return null;
        }
        if (!res.ok) {
          pushT("sys", `live retry failed (${backendDetail(res.data)}) — batch mode (pre-typed stdin only).`);
          return null;
        }
      } else if (!res.ok) {
        pushT("sys", `live run failed (${backendDetail(res.data)}) — batch mode (pre-typed stdin only).`);
        return null;
      }
      const data = res.data as {
        session_id?: string;
        state?: string;
        compile_output?: string;
        exit_code?: number | null;
        runtime?: string;
      };
      if (data.state === "failed") {
        if (data.compile_output)
          data.compile_output.split("\n").forEach((l) => pushT("warn", l));
        pushT("sys", `exit ${data.exit_code ?? 1} · ${Date.now() - startedAt} ms`);
        setResult({
          stdout: "",
          stderr: "",
          compile_output: data.compile_output ?? "",
          exit_code: data.exit_code ?? 1,
          runtime: data.runtime ?? `${language} (interactive)`,
          time_ms: Date.now() - startedAt,
        });
        setStatus("error");
        stopTimer();
        return "handled";
      }
      if (data.state !== "running" || !data.session_id) {
        pushT(
          "sys",
          `live runner replied "${data.state ?? "unknown"}" — batch mode (pre-typed stdin only).`
        );
        return null;
      }

      const sid = data.session_id;
      sessionRef.current = { id: sid };
      setSessionActive(true);
      offRef.current = { so: 0, se: 0 };
      remOutRef.current = "";
      remErrRef.current = "";
      setPendingOut("");
      setPendingErr("");
      setResult({
        stdout: "",
        stderr: "",
        compile_output: data.compile_output ?? "",
        exit_code: null,
        runtime: data.runtime ?? `${language} (interactive)`,
      });
      // INPUT box lines go in first, then lines typed in the terminal.
      // (Piped stdin isn't echoed — like `< input.txt` in a real shell;
      // only keystrokes typed live in the terminal echo.)
      // Sent in parallel: sequential awaits cost one round-trip per line.
      const pre = [...boxLines, ...queueRef.current];
      queueRef.current = [];
      await Promise.all(
        pre.map((line) =>
          postExec("/input", { session_id: sid, line }, 4000).catch(() => null)
        )
      );
      if (boxLines.length > 0)
        pushT("sys", `${boxLines.length} stdin line(s) piped from INPUT box — type below to interact live.`);
      const pollOnce = async () => {
        if (sessionRef.current?.id !== sid) return;
        if (pollingRef.current) return;
        pollingRef.current = true;
        let r: {
          state?: string;
          stdout?: string;
          stderr?: string;
          so?: number;
          se?: number;
          exit_code?: number | null;
          truncated?: boolean;
          error?: string;
        };
        try {
          const { so, se } = offRef.current;
          const tryPoll = async (base: string) => {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 8000);
            try {
              const url =
                base === "/api/proxy"
                  ? `${base}/exec/poll/${sid}?so=${so}&se=${se}`
                  : `${base}/exec/poll/${sid}?so=${so}&se=${se}`;
              const resp = await fetch(url, {
                signal: ctrl.signal,
                ...(base.startsWith("http") ? { mode: "cors" as RequestMode } : {}),
              });
              const ct = resp.headers.get("content-type") || "";
              if (!ct.includes("application/json") && resp.ok) throw new Error("poll html");
              const body = await resp.json().catch(() => ({}));
              if (!resp.ok) throw new Error(body?.error || `poll failed (${resp.status})`);
              return body;
            } finally {
              clearTimeout(t);
            }
          };
          // Poll is read-only (offset-based) — race both paths so a slow
          // route never stalls the live output stream.
          try {
            r = await Promise.any([tryPoll(BACKEND_BASE), tryPoll("/api/proxy")]);
          } catch {
            throw new Error("Lost connection to the runner.");
          }
        } catch (e) {
          if (sessionRef.current?.id !== sid) return;
          pushT("err", e instanceof Error ? e.message : "Lost connection to the runner.");
          endSession(sid, "error", startedAt, {});
          return;
        } finally {
          pollingRef.current = false;
        }
        if (sessionRef.current?.id !== sid) return;
        if (typeof r.so === "number" && typeof r.se === "number")
          offRef.current = { so: r.so, se: r.se };
        // Guard against duplicate chunks from stale offsets (concurrent poll protection)
        if (r.stdout && r.stdout.length > 0) {
          // If chunk is already contained in pending, skip (duplicate poll)
          if (remOutRef.current && r.stdout.startsWith(remOutRef.current) && r.stdout.length === remOutRef.current.length) {
            // duplicate — skip ingest
          } else {
            ingest("out", r.stdout);
          }
        } else if (r.stdout) {
          ingest("out", r.stdout);
        }
        if (r.stderr) ingest("err", r.stderr);
        if (r.state && r.state !== "running") {
          const failed =
            r.state === "timeout" ||
            r.state === "failed" ||
            (r.exit_code ?? 0) !== 0;
          endSession(sid, failed ? "error" : "success", startedAt, r);
        }
      };
      void pollOnce();
      pollRef.current = setInterval(() => void pollOnce(), 250);
      if (!isMobile) termInputRef.current?.focus({ preventScroll: true });
      return "session";
    },
    [postExec, language, code, filename, pushT, ingest, endSession, stopTimer, isMobile]
  );

  // If the page unmounts mid-run, stop the backend process too.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      sessionRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      if (s) {
        const payload = JSON.stringify({ session_id: s.id });
        void fetch("/api/proxy/exec/kill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        })
          .catch(() =>
            fetch(`${BACKEND_BASE}/exec/kill`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: payload,
              keepalive: true,
              mode: "cors",
            }).catch(() => {})
          )
          .catch(() => {});
      }
    };
  }, []);

  const run = useCallback(async () => {
    if (status === "running") return;
    if (!code.trim()) {
      pushT("err", "Write some code first, then hit Run.");
      return;
    }
    // stdin = INPUT box lines first, then anything queued in the terminal.
    const rawBox = stdinText.replace(/\r\n?/g, "\n");
    const boxLines: string[] = [];
    if (rawBox.trim() !== "") {
      boxLines.push(...rawBox.split("\n"));
      if (boxLines.length > 0 && boxLines[boxLines.length - 1] === "") boxLines.pop();
    }
    const needsStdin = readsStdin(code, language);
    const hasStdin = !(queueRef.current.length === 0 && boxLines.length === 0);
    if (needsStdin && !hasStdin) {
      if (language === "javascript") {
        pushT("sys", `reads input (${INPUT_HINT[language] ?? "stdin"}) — type it in the terminal; JS reads live mid-run.`);
      } else if (runner?.ok && runner.langs.includes(language)) {
        pushT(
          "sys",
          `reads input (${INPUT_HINT[language] ?? "stdin"}) — you can type it live in the terminal after Run, or pre-fill the INPUT box.`
        );
      } else if (runner?.ok) {
        pushT(
          "sys",
          `reads input (${INPUT_HINT[language] ?? "stdin"}) — live runner lacks ${language} toolchain (has: ${runner.langs.join(", ") || "none"}), so put values in the INPUT box above.`
        );
      } else {
        pushT(
          "sys",
          `reads input (${INPUT_HINT[language] ?? "stdin"}) — put it in the INPUT box above, or type it in the terminal when the live runner is reachable.`
        );
      }
    }
    setStatus("running");
    setResult(null);
    setWaiting(false);
    waitersRef.current = [];
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - t0), 100);

    const runFile = filename || `main.${langDef.extension}`;
    const runCmd = RUN_CMD[language] ?? "run";
    pushT("cmd", `$ ${runCmd} ${runFile}`);
    const startedAt = Date.now();

    // Live interactive process first (true mid-run input, prompts included).
    // Never block Run on a runner probe: use the cached state, refresh it
    // in the background, and try the live session optimistically — /start
    // itself fails fast when the backend is down or lacks the toolchain.
    // When the backend is known-offline (fresh check), skip it entirely and
    // go straight to the in-browser / cloud engines instead of timing out.
    const cachedRunner = runnerRef.current ?? runner;
    if (!cachedRunner || Date.now() - cachedRunner.at > 60000) void checkRunner(4000);
    const backendOffline =
      !!cachedRunner && Date.now() - cachedRunner.at < 60000 && !cachedRunner.ok;
    if (language !== "javascript") {
      const cur = cachedRunner;
      const live = !backendOffline;
      const liveSupportsLang = live && (cur?.langs.includes(language) ?? true);
      // If the runner is reachable but reports no toolchain for this language,
      // tell the user exactly that instead of a generic "unreachable".
      if (live && !liveSupportsLang) {
        pushT("sys", `live runner reachable but no ${language} toolchain — batch mode only (pre-typed stdin).`);
        pushT("sys", `backend at ${BACKEND_BASE} reports [${(cur?.langs ?? []).join(", ") || "none"}]; redeploy the Docker image with ${language === "java" ? "default-jdk-headless" : language === "go" ? "golang-go" : "the"} toolchain.`);
      }
      if (liveSupportsLang) {
        const mode = await startInteractive(startedAt, boxLines);
        if (mode !== null) return;
        // startInteractive already printed the specific reason — fall through
        // to the batch engines silently.
      } else if (!live) {
        pushT("sys", "live runner unreachable — batch mode (pre-typed stdin only).");
      }
      // Batch engines need every stdin line upfront and can never ask mid-run
      // — refuse an empty run instead of crashing on EOF.
      const probe = [...boxLines, ...queueRef.current].join("\n");
      if (probe.trim() === "" && needsStdin) {
        if (liveSupportsLang) {
          pushT("err", `no stdin provided, but this program reads input (${INPUT_HINT[language] ?? "stdin"}).`);
          pushT("sys", "live session should have prompted you — it failed. Retry, or fill the INPUT box and Run again.");
        } else if (live && !liveSupportsLang) {
          pushT("err", `no stdin provided, but this program reads input (${INPUT_HINT[language] ?? "stdin"}).`);
          pushT("sys", `the live runner cannot prompt for ${language} (no toolchain). Fill the INPUT box above (one value per line: e.g. Saket\\n21\\n90) and press Run again.`);
          pushT("sys", `to enable live prompts, redeploy the backend Docker image with ${language === "java" ? "JDK" : "the " + language + " toolchain"}.`);
        } else {
          pushT("err", `no stdin provided, but this program reads input (${INPUT_HINT[language] ?? "stdin"}).`);
          pushT("sys", "fill the INPUT box above and press Run again.");
          pushT("sys", "for live mid-run prompts the backend runner must be reachable — check that /exec/languages is ok and that CORS allows this origin.");
        }
        setStatus("error");
        stopTimer();
        return;
      }
    }

    let boxIdx = 0;
    const io: LocalRunIO = {
      takeLine: () => {
        if (boxIdx < boxLines.length) return boxLines[boxIdx++];
        return queueRef.current.length > 0 ? queueRef.current.shift()! : null;
      },
      waitLine: () =>
        new Promise<string>((resolve) => {
          waitersRef.current.push(resolve);
        }),
      print: (text) => pushT("out", text),
      printErr: (text) => pushT("err", text),
      setWaiting,
    };

    const finishRun = (data: RunResult, streamed: boolean) => {
      setResult(data);
      if (!streamed) {
        if (data.compile_output) data.compile_output.split("\n").forEach((l) => pushT("warn", l));
        if (data.stdout) data.stdout.split("\n").forEach((l) => pushT("out", l));
      }
      if (data.stderr) data.stderr.split("\n").forEach((l) => pushT("err", l));
      pushT("sys", `exit ${data.exit_code ?? "?"} · ${data.time_ms ?? Date.now() - startedAt} ms`);
      const failed =
        (data.exit_code ?? 0) !== 0 ||
        Boolean(data.stderr) ||
        Boolean(data.compile_output);
      setStatus(failed ? "error" : "success");
    };

    // Backend batch engine (POST /execute): authoritative routing by the
    // `language` field, stdin via write+close. Returns null when the backend
    // can't serve it so the caller falls back to the cloud sandbox.
    // Skipped outright when the backend is known-offline — no point waiting
    // out two timeouts for an answer we already have. Direct first (one
    // fewer hop), proxy as fallback.
    const runBatchBackend = async (stdinStr: string): Promise<RunResult | null> => {
      if (backendOffline) return null;
      const tryBackend = async (base: string, path: string): Promise<RunResult | null> => {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 22000);
          let r: Response;
          let data: {
            success?: boolean; stdout?: string; stderr?: string;
            compile_output?: string; exit_code?: number | null;
            execution_time?: number; error_type?: string | null; language?: string;
          };
          try {
            const url = base === "/api/proxy" ? `${base}${path}` : `${base}${path}`;
            r = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ language, code, stdin: stdinStr, filename, timeout: 15 }),
              signal: ctrl.signal,
              ...(base.startsWith("http") ? { mode: "cors" as RequestMode } : {}),
            });
            data = await r.json().catch(() => ({}));
          } finally {
            clearTimeout(t);
          }
          if (!r.ok) return null;
          return {
            stdout: data.stdout ?? "",
            stderr: data.stderr ?? "",
            compile_output: data.compile_output ?? "",
            exit_code: data.exit_code ?? null,
            runtime: `${data.language ?? language} (backend)`,
            time_ms: data.execution_time != null ? Math.round(data.execution_time * 1000) : undefined,
          };
        } catch {
          return null;
        }
      };
      // Direct first — proxy can be stale HTML 200
      const viaDirect = await tryBackend(BACKEND_BASE, "/execute");
      if (viaDirect) return viaDirect;
      return tryBackend("/api/proxy", "/execute");
    };

    // Browser engines consume stdin progressively; batch engines get one
    // snapshot: INPUT box lines first, then queued terminal lines.
    const takeStdinSnapshot = (): string => {
      const snap = [...boxLines, ...queueRef.current].join("\n");
      queueRef.current = [];
      return snap;
    };

    // Browser engines consume the queued terminal lines progressively;
    // remote toolchains get a snapshot taken at Run time.
    // Tries the Next.js API route first, then direct Godbolt via backend
    // batch (already tried) — final fallback is the cloud sandbox.
    const runRemote = async (stdinStr: string) => {
      const tryPlayground = async (url: string, opts?: RequestInit) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 30000);
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language, code, stdin: stdinStr, filename }),
            signal: ctrl.signal,
            ...(opts || {}),
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data?.error || `Execution failed (${r.status})`);
          return data as RunResult;
        } finally {
          clearTimeout(t);
        }
      };
      try {
        return await tryPlayground("/api/playground");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("404") || msg.includes("Failed to fetch")) {
          // On static GH Pages the API route is missing — the batch backend
          // already failed above, so surface the same error clearly.
          throw new Error(`cloud sandbox unreachable (static hosting has no /api/playground). ${msg}`);
        }
        throw e;
      }
    };

    try {
      if (language === "javascript") {
        finishRun(await runJavaScriptLocally(code, io), true);
      } else if (language === "python") {
        // Prefer in-browser Pyodide (instant, no rate limits); fall back
        // to the backend batch engine, then the cloud sandbox.
        try {
          finishRun(await runPythonLocally(code, io, (m) => pushT("sys", m)), true);
        } catch (e) {
          pushT("sys", "Browser Python unavailable — trying backends…");
          const snap = takeStdinSnapshot();
          const batched = await runBatchBackend(snap);
          if (batched) {
            finishRun(batched, false);
          } else {
            pushT("sys", "backend unreachable — cloud-sandbox fallback.");
            finishRun(await runRemote(snap), false);
          }
        }
      } else {
        const snap = takeStdinSnapshot();
        const batched = await runBatchBackend(snap);
        if (batched) {
          finishRun(batched, false);
        } else {
          pushT("sys", "backend unreachable — cloud-sandbox fallback.");
          finishRun(await runRemote(snap), false);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong while running your code.";
      pushT("err", msg);
      setStatus("error");
    } finally {
      setWaiting(false);
      waitersRef.current = [];
      queueRef.current = [];
      stopTimer();
    }
  }, [code, language, filename, langDef, status, stopTimer, pushT, startInteractive, stdinText, runner, checkRunner]);

  // Ctrl/Cmd + Enter is bound inside Monaco (see CodeEditor).
  // Stable callback so the editor binding never goes stale.
  const runRef = useRef(run);
  runRef.current = run;
  const handleEditorRun = useCallback(() => {
    void runRef.current();
  }, []);

  const focusTerminal = useCallback(() => {
    termInputRef.current?.focus({ preventScroll: true });
  }, []);

  const clearTerminal = useCallback(() => {
    setTranscript([]);
    queueRef.current = [];
  }, []);

  const copyTerminal = useCallback(async () => {
    const text = [...transcript.map((l) => l.text), pendingOut, pendingErr]
      .filter((t) => t !== "")
      .join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setTermCopied(true);
      setTimeout(() => setTermCopied(false), 1800);
    } catch {
      pushT("err", "Could not copy to clipboard in this browser.");
    }
  }, [transcript, pendingOut, pendingErr, pushT]);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const reset = useCallback(() => {
    setCode(langDef.defaultCode);
    setFilename(defaultFilename(language, langDef.extension));
    setFilenameTouched(false);
    setStdinText("");
    try {
      localStorage.removeItem(storageKey(language));
      localStorage.removeItem(stdinKey(language));
    } catch {
      /* ignore */
    }
    setResult(null);
    setStatus("idle");
    queueRef.current = [];
    waitersRef.current = [];
    setWaiting(false);
  }, [langDef, language]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      pushT("err", "Could not copy to clipboard in this browser.");
    }
  }, [code, pushT]);

  const download = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `deviq-playground.${langDef.extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, filename, langDef]);

  const statusColor =
    status === "success" ? tk.green : status === "error" ? tk.rose : tk.text3;
  const statusBg =
    status === "success" ? tk.greenLight : status === "error" ? tk.roseLight : tk.bgAlt;
  const statusBorder =
    status === "success"
      ? tk.greenBorder
      : status === "error"
        ? tk.roseBorder
        : tk.border;

  const termPlaceholder =
    status === "running"
      ? sessionActive || waiting || language === "javascript"
        ? "Type input, Enter to send it to the program…"
        : "Running… you can queue the next input line here…"
      : readsStdin(code, language)
        ? `Type input for ${INPUT_HINT[language] ?? "stdin"}, Enter to queue, then Run…`
        : "Type here if the program needs input, Enter to queue…";

  // Fixed palette: the terminal body is always dark, like a real console.
  const lineStyle = (kind: TLineKind) => {
    const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    switch (kind) {
      case "cmd":
        return { color: "#7ee787", fontWeight: 700, fontFamily: mono };
      case "in":
        return { color: "#79c0ff", fontFamily: mono };
      case "err":
        return { color: "#ffa198", fontFamily: mono };
      case "warn":
        return { color: "#d29922", fontFamily: mono };
      case "sys":
        return { color: "#8b949e", fontStyle: "italic", fontFamily: mono };
      default:
        return { color: "#e6edf3", fontFamily: mono };
    }
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: tk.text3,
            marginBottom: 10,
          }}
        >
          Interactive Code Playground
        </div>
        <h1
          style={{
            fontSize: isMobile ? "clamp(28px,9vw,42px)" : "clamp(34px,5vw,50px)",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: tk.text,
            lineHeight: 1.08,
            marginBottom: 12,
          }}
        >
          Write code. Run it. See output.
        </h1>
        <p style={{ fontSize: 14, color: tk.text2, lineHeight: 1.7, maxWidth: 640 }}>
          An in-browser playground built into DevIQ — JavaScript runs instantly
          on your device, and Python, Java, C, C++, Go and TypeScript run
          interactively: the program can prompt you mid-run and you answer
          right in the terminal. (If the live runner is unreachable, runs fall
          back to the browser / cloud sandbox with pre-typed input.) Press{" "}
          <kbd
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              background: tk.bgAlt,
              border: `1px solid ${tk.border}`,
              borderRadius: 5,
              padding: "1px 6px",
            }}
          >
            Ctrl + Enter
          </kbd>{" "}
          to run.
        </p>
      </div>

      {/* LANGUAGE BAR */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label htmlFor="deviq-playground-lang" style={{ fontSize: 12, color: tk.text3, fontWeight: 500 }}>
          Language
        </label>
        <select
          id="deviq-playground-lang"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
              {l.id === "javascript" ? "  ·  instant" : LIVE_LANGS.includes(l.id) ? "  ·  interactive" : ""}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 20,
            border: `1px solid ${language === "javascript" ? tk.greenBorder : LIVE_LANGS.includes(language) ? tk.blueBorder : tk.purpleBorder}`,
            background: language === "javascript" ? tk.greenLight : LIVE_LANGS.includes(language) ? tk.blueLight : tk.purpleLight,
            color: language === "javascript" ? tk.green : LIVE_LANGS.includes(language) ? tk.blue : tk.purple,
          }}
        >
          {language === "javascript" ? "Runs locally" : LIVE_LANGS.includes(language) ? "Interactive" : "Runs in sandbox"}
        </span>
        <label htmlFor="deviq-playground-file" style={{ fontSize: 12, color: tk.text3, fontWeight: 500 }}>
          File
        </label>
        <input
          id="deviq-playground-file"
          value={filename}
          onChange={(e) => {
            setFilename(e.target.value.replace(/[\\/]/g, "").slice(0, 64));
            setFilenameTouched(true);
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={defaultFilename(language, langDef.extension)}
          title={language === "java" ? "Java: the filename must match your public class name (e.g. Calculator.java for public class Calculator)" : "Filename used for download"}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text,
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            outline: "none",
            width: 150,
          }}
        />
        <div style={{ flex: 1 }} />
        <button
          onClick={copyCode}
          style={{
            padding: "7px 13px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
        <button
          onClick={download}
          style={{
            padding: "7px 13px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Download .{langDef.extension}
        </button>
        <button
          onClick={reset}
          style={{
            padding: "7px 13px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
        <button
          onClick={() => {
            if (status === "running") {
              if (sessionRef.current) killSession();
              return;
            }
            void run();
          }}
          disabled={status === "running" && !sessionActive}
          title={status === "running" && sessionActive ? "Stop the running program" : "Run the program"}
          style={{
            padding: "8px 22px",
            borderRadius: 8,
            border: "none",
            background: status === "running" ? (sessionActive ? tk.rose : tk.track) : tk.accent,
            color: tk.accentFg,
            fontSize: 13,
            fontWeight: 700,
            cursor: status === "running" && !sessionActive ? "wait" : "pointer",
            opacity: status === "running" && !sessionActive ? 0.7 : 1,
          }}
        >
          {status === "running"
            ? sessionActive
              ? "■ Stop"
              : `Running… ${(elapsed / 1000).toFixed(1)}s`
            : "▶  Run"}
        </button>
      </div>

      {language === "java" && (
        <div style={{ fontSize: 12, color: tk.text3, margin: "-4px 0 12px", lineHeight: 1.6 }}>
          Java rule: the filename must match your public class name — e.g. <span style={{ fontFamily: "monospace" }}>Calculator.java</span> for <span style={{ fontFamily: "monospace" }}>public class Calculator</span>. The filename fills in automatically as you type.
        </div>
      )}

      {/* INPUT / STDIN — one value per line, fed to the program in order */}
      <div
        style={{
          marginBottom: 12,
          background: tk.surface,
          border: `1px solid ${tk.border}`,
          borderRadius: 10,
          boxShadow: tk.shadow,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${tk.border}`,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3 }}>
            Input · stdin
          </span>
          <span style={{ fontSize: 12, color: tk.text3 }}>
            lines are fed to <span style={{ fontFamily: "monospace" }}>{INPUT_HINT[language] ?? "stdin"}</span> in order
            {LIVE_LANGS.includes(language) && language !== "javascript"
              ? " — during live runs you can also type in the terminal"
              : ""}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: tk.text3, fontVariantNumeric: "tabular-nums" }}>
            {stdinText ? `${stdinText.replace(/\r\n?/g, "\n").split("\n").length} lines` : "empty"}
          </span>
          {stdinText && (
            <button
              onClick={() => setStdinText("")}
              style={{
                padding: "4px 11px",
                borderRadius: 7,
                border: `1px solid ${tk.border}`,
                background: tk.bgAlt,
                color: tk.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={stdinText}
          onChange={(e) => setStdinText(e.target.value)}
          placeholder={`One input per line, in the order the program reads it.\nExample:\nSaket\n21\n90`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Program input (stdin), one value per line"
          rows={3}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            minHeight: 66,
            padding: "10px 14px",
            background: tk.bgAlt,
            border: "none",
            outline: "none",
            resize: "vertical",
            color: tk.text,
            fontSize: 13,
            lineHeight: 1.7,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          }}
        />
      </div>

      {/* EDITOR + TERMINAL */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.15fr 1fr",
          gap: 12,
          alignItems: "stretch",
        }}
      >
        {/* Editor */}
        <div
          style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: tk.shadow,
            display: "flex",
            flexDirection: "column",
            minHeight: 420,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              borderBottom: `1px solid ${tk.border}`,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FEBC2E" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
            <span style={{ marginLeft: 8, fontSize: 12, color: tk.text3, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {filename || `main.${langDef.extension}`}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: tk.text3, fontVariantNumeric: "tabular-nums" }}>
              {lineCount} lines · {code.length} chars
            </span>
          </div>
          <div style={{ padding: "6px 0 0" }}>
            <CodeEditor
              language={language}
              code={code}
              onChange={setCode}
              onRun={handleEditorRun}
              dark={dark}
              height={isMobile ? 380 : 420}
            />
          </div>
        </div>

        {/* Terminal — code compiles & runs here; program input is typed here too */}
        <div
          style={{
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: tk.shadow,
            display: "flex",
            flexDirection: "column",
            minHeight: 420,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: `1px solid ${tk.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3 }}>
              Terminal
            </span>
            <button
              onClick={() => void checkRunner()}
              title={
                !runner
                  ? "Checking live runner… (click to re-check)"
                  : runner.ok
                    ? `Live runner connected (${runner.langs.join(", ") || "no toolchains"}) — click to re-check`
                    : "Live runner unreachable — mid-run prompts unavailable, batch only. Click to re-check."
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                border: `1px solid ${tk.border}`,
                background: tk.bgAlt,
                color: tk.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 9, color: !runner ? tk.text3 : runner.ok ? "#3fb950" : "#f85149" }}>
                ●
              </span>
              {!runner ? "…" : runner.ok ? "Live" : "Offline"}
            </button>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: 20,
                border: `1px solid ${statusBorder}`,
                background: statusBg,
                color: statusColor,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {status === "running" ? `Running ${(elapsed / 1000).toFixed(1)}s` : status}
            </span>
            {result?.runtime && (
              <span style={{ fontSize: 11, color: tk.text3, fontFamily: "monospace" }}>
                {result.runtime}
              </span>
            )}
            <button
              onClick={() => void copyTerminal()}
              title="Copy the terminal contents"
              style={{
                padding: "4px 11px",
                borderRadius: 7,
                border: `1px solid ${tk.border}`,
                background: tk.bgAlt,
                color: tk.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {termCopied ? "Copied ✓" : "Copy"}
            </button>
            <button
              onClick={clearTerminal}
              title="Clear the terminal"
              style={{
                padding: "4px 11px",
                borderRadius: 7,
                border: `1px solid ${tk.border}`,
                background: tk.bgAlt,
                color: tk.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          <div
            ref={termScrollRef}
            onClick={focusTerminal}
            style={{
              flex: 1,
              height: isMobile ? 320 : 380,
              maxHeight: 520,
              overflowY: "auto",
              padding: "12px 14px",
              background: "#0d1117",
              fontSize: 12.5,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              cursor: "text",
            }}
          >
            {transcript.length === 0 ? (
              <div style={{ color: "#8b949e", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                <div>$ — terminal ready. Press Run to compile &amp; execute.</div>
                {readsStdin(code, language) ? (
                  <div>ⓘ this program reads input ({INPUT_HINT[language] ?? "stdin"}) — type it below, press Enter, then Run.</div>
                ) : (
                  <div>ⓘ if your program needs input, type it below and press Enter.</div>
                )}
              </div>
            ) : (
              transcript.map((l) => (
                <div key={l.id} style={lineStyle(l.kind)}>
                  {l.kind === "in"
                    ? `> ${l.text}`
                    : l.kind === "sys"
                      ? `● ${l.text}`
                      : l.text === ""
                        ? " "
                        : l.text}
                </div>
              ))
            )}
            {waiting && (
              <div style={{ color: "#79c0ff", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                &gt; <span style={{ animation: "deviq-blink 1.1s ease-in-out infinite" }}>▍</span> waiting for input — type below and press Enter…
                <style>{`@keyframes deviq-blink{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
              </div>
            )}
            {pendingOut !== "" && (
              <div style={lineStyle("out")}>{pendingOut}</div>
            )}
            {pendingErr !== "" && (
              <div style={lineStyle("err")}>{pendingErr}</div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (termInput === "" && status !== "running") return;
              submitTermLine(termInput);
              setTermInput("");
              termInputRef.current?.focus({ preventScroll: true });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderTop: "1px solid #21262d",
              background: "#0d1117",
            }}
          >
            <span style={{ color: "#3fb950", fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
              &gt;
            </span>
            <input
              ref={termInputRef}
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              placeholder={termPlaceholder}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              aria-label="Terminal input — type program input here"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#e6edf3",
                fontSize: 13,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              }}
            />
            <button
              type="submit"
              title="Send this line to the program (Enter)"
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                border: "1px solid #30363d",
                background: "#21262d",
                color: "#e6edf3",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Send ↵
            </button>
          </form>
        </div>

      </div>

      {/* QUICK EXAMPLES */}
      <div
        style={{
          marginTop: 12,
          background: tk.surface,
          border: `1px solid ${tk.border}`,
          borderRadius: 10,
          boxShadow: tk.shadow,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${tk.border}`,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: tk.text3,
          }}
        >
          Tips
        </div>
        <div
          style={{
            padding: "12px 14px",
            fontSize: 12.5,
            color: tk.text2,
            lineHeight: 1.8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div>• VS Code-powered editing: syntax highlighting, word suggestions as you type, and <kbd style={{ fontFamily: "monospace", fontSize: 12, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 5, padding: "1px 6px" }}>Ctrl + Space</kbd> for manual autocomplete.</div>
          <div>• JavaScript executes instantly in your browser — no network needed, console.log is captured.</div>
          <div>• Python runs in your browser too (Pyodide) — print() and input() work, numpy auto-loads on import.</div>
          <div>• Python, Java, C, C++, Go and TypeScript run on the live runner — prompts like <span style={{ fontFamily: "monospace" }}>Enter your name:</span> appear mid-run and you answer in the terminal. Rust, Kotlin, C# and Ruby use the cloud sandbox with pre-typed input.</div>
          <div>• Type program input directly in the terminal — every language reads it there: <span style={{ fontFamily: "monospace" }}>prompt()</span> and <span style={{ fontFamily: "monospace" }}>input()</span> in JS/Python (JS even mid-run), <span style={{ fontFamily: "monospace" }}>Scanner</span> in Java, <span style={{ fontFamily: "monospace" }}>scanf / cin / fmt.Scan</span> and friends elsewhere. For sandboxed languages, type input lines before pressing Run. Your code auto-saves per language.</div>
        </div>
      </div>
    </div>
  );
}
