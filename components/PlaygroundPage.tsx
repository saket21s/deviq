"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    defaultCode: `# Python runs instantly in your browser (Pyodide).\n# input() reads from the "stdin" box below.\nprint("Hello from DevIQ Playground!")\n\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=" ")\n        a, b = b, a + b\n\nfibonacci(10)\nprint()`,
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

function storageKey(lang: string) {
  return `deviq_playground_${lang}`;
}

/** Run JavaScript locally in the browser with console capture. */
async function runJavaScriptLocally(code: string): Promise<RunResult> {
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
    table: (data: unknown) => {
      try {
        logs.push(JSON.stringify(data, null, 2) ?? String(data));
      } catch {
        logs.push(String(data));
      }
    },
    clear: () => void logs.length,
  };

  const t0 = performance.now();
  try {
    // Wrap in async function so top-level await works.
    const fn = new Function(
      "console",
      `"use strict";\nreturn (async () => {\n${code}\n})();`
    );
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out after 5s (infinite loop?)")), 5000)
    );
    await Promise.race([fn(sandboxConsole), timeout]);
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
  stdin: string,
  onStatus: (msg: string) => void
): Promise<RunResult> {
  const t0 = performance.now();
  const py = await loadPyodideOnce(onStatus);
  const out: string[] = [];
  const err: string[] = [];
  py.setStdout({ batched: (s) => void out.push(s) });
  py.setStderr({ batched: (s) => void err.push(s) });
  // Feed stdin char-by-char so input() works line by line.
  const chars = stdin.length > 0 ? `${stdin}\n`.split("") : [];
  let ci = 0;
  py.setStdin({
    isatty: false,
    stdin: () => {
      if (ci >= chars.length) return null; // EOF -> input() raises EOFError
      return chars[ci++]!.charCodeAt(0);
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
}: {
  tk: PlaygroundTheme;
  isMobile: boolean;
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
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(false);
  const [status, setStatus] = useState<RunStatus>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [runNote, setRunNote] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted code when language changes.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey(language));
      setCode(saved ?? langDef.defaultCode);
    } catch {
      setCode(langDef.defaultCode);
    }
    setFilename(defaultFilename(language, langDef.extension));
    setFilenameTouched(false);
    setResult(null);
    setError(null);
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

  const run = useCallback(async () => {
    if (status === "running") return;
    if (!code.trim()) {
      setError("Write some code first, then hit Run.");
      return;
    }
    setStatus("running");
    setError(null);
    setResult(null);
    setRunNote(null);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - t0), 100);

    const runRemote = async () => {
      const r = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin, filename }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(data?.error || `Execution failed (${r.status})`);
      }
      return data as RunResult;
    };
    const finishRemote = (data: RunResult) => {
      setResult(data);
      const failed =
        (data.exit_code ?? 0) !== 0 ||
        Boolean(data.stderr) ||
        Boolean(data.compile_output);
      setStatus(failed ? "error" : "success");
    };

    try {
      if (language === "javascript") {
        const res = await runJavaScriptLocally(code);
        setResult(res);
        setStatus(res.exit_code === 0 ? "success" : "error");
      } else if (language === "python") {
        // Prefer in-browser Pyodide (instant, no rate limits); fall back
        // to the server sandbox if the runtime can't load.
        try {
          const res = await runPythonLocally(code, stdin, (m) => setRunNote(m));
          setRunNote(null);
          setResult(res);
          setStatus(res.exit_code === 0 ? "success" : "error");
        } catch (e) {
          setRunNote("Browser Python unavailable — using cloud sandbox…");
          finishRemote(await runRemote());
        }
      } else {
        finishRemote(await runRemote());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while running your code.");
      setStatus("error");
    } finally {
      setRunNote(null);
      stopTimer();
    }
  }, [code, language, stdin, filename, status, stopTimer]);

  // Ctrl/Cmd + Enter to run.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void run();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const el = textareaRef.current;
        if (!el) return;
        const { selectionStart: s, selectionEnd: en, value } = el;
        const next = value.slice(0, s) + "  " + value.slice(en);
        setCode(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = s + 2;
        });
      }
    },
    [run]
  );

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const g = gutterRef.current;
    if (ta && g) {
      g.scrollTop = ta.scrollTop;
    }
  }, []);

  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const reset = useCallback(() => {
    setCode(langDef.defaultCode);
    setFilename(defaultFilename(language, langDef.extension));
    setFilenameTouched(false);
    try {
      localStorage.removeItem(storageKey(language));
    } catch {
      /* ignore */
    }
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [langDef, language]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy to clipboard in this browser.");
    }
  }, [code]);

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

  const hasOutput =
    result &&
    (result.stdout || result.stderr || result.compile_output || result.exit_code !== null);

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
          An in-browser playground built into DevIQ — JavaScript and Python run
          instantly on your device, and TypeScript, Java, C, C++, Go, Rust,
          Kotlin, C# and Ruby run on a sandboxed cloud toolchain. Press{" "}
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
              {l.id === "javascript" ? "  ·  instant" : l.id === "python" ? "  ·  browser" : ""}
            </option>
          ))}
        </select>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 20,
            border: `1px solid ${language === "javascript" || language === "python" ? tk.greenBorder : tk.blueBorder}`,
            background: language === "javascript" || language === "python" ? tk.greenLight : tk.blueLight,
            color: language === "javascript" || language === "python" ? tk.green : tk.blue,
          }}
        >
          {language === "javascript" || language === "python" ? "Runs locally" : "Runs in sandbox"}
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
          onClick={() => setShowStdin((s) => !s)}
          style={{
            padding: "7px 13px",
            borderRadius: 8,
            border: `1px solid ${tk.border}`,
            background: showStdin ? tk.bgAlt : tk.surface,
            color: tk.text2,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {showStdin ? "Hide stdin" : "Add stdin"}
        </button>
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
          onClick={() => void run()}
          disabled={status === "running"}
          style={{
            padding: "8px 22px",
            borderRadius: 8,
            border: "none",
            background: status === "running" ? tk.track : tk.accent,
            color: tk.accentFg,
            fontSize: 13,
            fontWeight: 700,
            cursor: status === "running" ? "wait" : "pointer",
            opacity: status === "running" ? 0.7 : 1,
          }}
        >
          {status === "running" ? `Running… ${(elapsed / 1000).toFixed(1)}s` : "▶  Run"}
        </button>
      </div>

      {language === "java" && (
        <div style={{ fontSize: 12, color: tk.text3, margin: "-4px 0 12px", lineHeight: 1.6 }}>
          Java rule: the filename must match your public class name — e.g. <span style={{ fontFamily: "monospace" }}>Calculator.java</span> for <span style={{ fontFamily: "monospace" }}>public class Calculator</span>. The filename fills in automatically as you type.
        </div>
      )}

      {showStdin && (
        <div
          style={{
            marginBottom: 12,
            background: tk.surface,
            border: `1px solid ${tk.border}`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: tk.shadow,
          }}
        >
          <div
            style={{
              padding: "9px 14px",
              borderBottom: `1px solid ${tk.border}`,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: tk.text3,
            }}
          >
            Standard input (stdin) — fed to your program
          </div>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder={"One value per line, e.g.\n5\n10"}
            rows={3}
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "none",
              outline: "none",
              resize: "vertical",
              background: "transparent",
              color: tk.text,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.6,
              padding: "12px 14px",
            }}
          />
        </div>
      )}

      {/* EDITOR + OUTPUT */}
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
          <div style={{ display: "flex", flex: 1, minHeight: 380, position: "relative" }}>
            <div
              ref={gutterRef}
              aria-hidden
              style={{
                width: 52,
                flexShrink: 0,
                overflow: "hidden",
                background: tk.bgAlt,
                borderRight: `1px solid ${tk.border}`,
                padding: "14px 8px 14px 0",
                textAlign: "right",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.65,
                color: tk.text3,
                userSelect: "none",
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onKeyDown}
              onScroll={syncScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label="Code editor"
              placeholder="// Write code here, then press Ctrl + Enter to run"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                resize: "none",
                background: "transparent",
                color: tk.text,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 13,
                lineHeight: 1.65,
                padding: "14px 16px",
                whiteSpace: "pre",
                overflow: "auto",
                minHeight: 380,
              }}
            />
          </div>
        </div>

        {/* Output */}
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
              Output
            </span>
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
              }}
            >
              {status === "running" ? "Running" : status}
            </span>
            {result?.runtime && (
              <span style={{ fontSize: 11, color: tk.text3, fontFamily: "monospace" }}>
                {result.runtime}
              </span>
            )}
          </div>

          <div style={{ flex: 1, padding: 14, overflowY: "auto", maxHeight: 520 }}>
            {status === "running" && (
              <div style={{ color: tk.text3, fontSize: 13 }}>
                <div style={{ marginBottom: 8 }}>{runNote || "Executing your code…"}</div>
                <div style={{ height: 3, borderRadius: 3, background: tk.track, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: "40%",
                      borderRadius: 3,
                      background: tk.blue,
                      animation: "deviq-slide 1s ease-in-out infinite alternate",
                    }}
                  />
                </div>
                <style>{`@keyframes deviq-slide{from{margin-left:0}to{margin-left:60%}}`}</style>
              </div>
            )}

            {error && status !== "running" && (
              <div
                style={{
                  background: tk.roseLight,
                  border: `1px solid ${tk.roseBorder}`,
                  borderRadius: 8,
                  padding: "12px 14px",
                  color: tk.rose,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {error}
              </div>
            )}

            {status === "idle" && !result && !error && (
              <div style={{ color: tk.text3, fontSize: 13, lineHeight: 1.7 }}>
                No output yet.
                <br />
                Write code on the left and press{" "}
                <strong style={{ color: tk.text2 }}>Run</strong> (or{" "}
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
                </kbd>
                ).
                <br />
                <br />
                stdout, errors, exit code and timing will appear here.
              </div>
            )}

            {result && status !== "running" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.compile_output ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tk.amber, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      Compile output
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        background: tk.amberLight,
                        border: `1px solid ${tk.amberBorder}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: tk.text,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      }}
                    >
                      {result.compile_output}
                    </pre>
                  </div>
                ) : null}

                {result.stdout ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tk.green, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      stdout
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        background: tk.bgAlt,
                        border: `1px solid ${tk.border}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: tk.text,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      }}
                    >
                      {result.stdout}
                    </pre>
                  </div>
                ) : null}

                {result.stderr ? (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: tk.rose, marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      stderr / errors
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        background: tk.roseLight,
                        border: `1px solid ${tk.roseBorder}`,
                        borderRadius: 8,
                        padding: "10px 12px",
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        color: tk.rose,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      }}
                    >
                      {result.stderr}
                    </pre>
                  </div>
                ) : null}

                {!hasOutput && (
                  <div style={{ fontSize: 13, color: tk.text3 }}>
                    Program ran with no output. Try printing something!
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                  {result.exit_code !== null && result.exit_code !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 20,
                        border: `1px solid ${result.exit_code === 0 ? tk.greenBorder : tk.roseBorder}`,
                        background: result.exit_code === 0 ? tk.greenLight : tk.roseLight,
                        color: result.exit_code === 0 ? tk.green : tk.rose,
                        fontFamily: "monospace",
                      }}
                    >
                      exit {result.exit_code}
                    </span>
                  )}
                  {result.time_ms !== null && result.time_ms !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 20,
                        border: `1px solid ${tk.border}`,
                        background: tk.bgAlt,
                        color: tk.text2,
                        fontFamily: "monospace",
                      }}
                    >
                      {result.time_ms} ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
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
          <div>• JavaScript executes instantly in your browser — no network needed, console.log is captured.</div>
          <div>• Python runs in your browser too (Pyodide) — print() and input() work, numpy auto-loads on import.</div>
          <div>• TypeScript, Java, C, C++, Go, Rust, Kotlin, C# and Ruby compile & run in a secure cloud sandbox (up to ~90s for heavy toolchains).</div>
          <div>• Use “Add stdin” to test programs that read input. Your code auto-saves per language.</div>
        </div>
      </div>
    </div>
  );
}
