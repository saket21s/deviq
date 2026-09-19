"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaygroundTheme } from "./PlaygroundPage";

const BACKEND = "https://deviq-backend-x6a9.onrender.com";

/* ── Types ─────────────────────────────────────────── */
export interface ReviewBug {
  severity: string;
  title: string;
  detail: string;
  line?: number | null;
  category?: string;
  trigger?: string;
  expected?: string;
  actual?: string;
  fix?: string;
  confidence?: number | null;
}
/* A warning is NOT a bug: something that MIGHT fail (edge case, extreme
 * input, exception path, missing validation) rather than something that
 * WILL fail on normal inputs. */
export interface ReviewWarning {
  severity: string;
  title: string;
  detail: string;
  line?: number | null;
}
export interface ReviewSecurity {
  severity: string;
  title: string;
  detail: string;
  fix?: string;
}
export interface ReviewQuality {
  area: string;
  feedback: string;
}
export interface ReviewResult {
  summary: string;
  score: number | null;
  bugs: ReviewBug[];
  warnings: ReviewWarning[];
  time_complexity: { value: string; explanation: string };
  space_complexity: { value: string; explanation: string };
  security: ReviewSecurity[];
  quality: ReviewQuality[];
  improvements: string[];
  fixed_code?: string | null;
  /** Repair strategy when the engine reports one (MINIMAL_FIX, etc.). */
  repair_strategy?: string | null;
  /** Sections that never produced a verified answer AND came back empty.
   *  The UI shows "couldn't verify" instead of "none found" for these. */
  partial?: string[];
  /** True when the fixed program may have been cut off mid-file. */
  fixed_truncated?: boolean;
}
/* ── Time/Space optimization (improved-complexity rewrite) ── */
export interface ComplexityPoint {
  value: string;
  explanation: string;
}
export interface QualityGain {
  title: string;
  detail: string;
}
export interface ImprovementArea {
  area: string;
  detail: string;
  impact: string;
}
export interface OptimizationResult {
  original_time: ComplexityPoint;
  original_space: ComplexityPoint;
  optimized_time: ComplexityPoint;
  optimized_space: ComplexityPoint;
  optimized_code: string | null;
  techniques: string[];
  /** How the rewrite improves overall code quality. */
  quality_gains: QualityGain[];
  /** Where the user can still improve. */
  improvement_areas: ImprovementArea[];
  optimized_truncated?: boolean;
}
interface StaticFinding {
  severity: "critical" | "high" | "medium" | "low";
  category: "Security" | "Bug risk" | "Quality";
  title: string;
  detail: string;
  line: number | null;
}
type Status = "idle" | "loading" | "success" | "error";

const LANG_OPTIONS = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "go",
  "rust",
  "ruby",
  "csharp",
  "kotlin",
  "php",
  "other",
];

/* ── Language auto-detect (heuristic, convenience only) ── */
export function detectLanguage(code: string): string {
  const c = code || "";
  if (/^\s*<\?php/m.test(c)) return "php";
  if (/^\s*package\s+main/m.test(c) || /func\s+main\s*\(/.test(c)) return "go";
  if (/fn\s+main\s*\(|let\s+mut\s+|println!\s*\(/.test(c)) return "rust";
  if (/^\s*#include\b/m.test(c)) return /std::|cout\s*<<|cin\s*>>|using\s+namespace/.test(c) ? "cpp" : "c";
  if (/using\s+System\s*;|Console\.WriteLine|namespace\s+\w+/.test(c)) return "csharp";
  if (/^\s*public\s+(class|static)|System\.out\.println/.test(c)) return "java";
  if (/^\s*fun\s+main\s*\(/.test(c)) return "kotlin";
  if (/^\s*puts\s+["']|attr_accessor|require\s+['"]/.test(c)) return "ruby";
  if (
    /^\s*(import\s+\w+|from\s+\S+\s+import\s+|def\s+\w+\s*\(|if\s+__name__\s*==|print\s*\()/.test(c) &&
    /:\s*$/m.test(c)
  )
    return "python";
  if (/:\s*(string|number|boolean|void|any)\b|interface\s+\w+|enum\s+\w+/.test(c)) return "typescript";
  return "javascript";
}

/* ── Instant static checks (run locally, no AI) ── */
function lineOf(code: string, index: number): number {
  return code.slice(0, index).split("\n").length;
}
interface StaticRule {
  langs: string[]; // ["*"] = all languages
  pattern: RegExp; // must use the /g flag — EVERY occurrence is reported
  severity: StaticFinding["severity"];
  category: StaticFinding["category"];
  title: string;
  detail: string;
  max?: number; // max findings per rule (default 3)
}
const STATIC_RULES: StaticRule[] = [
  // ── Universal ──
  { langs: ["*"], pattern: /(api[_-]?key|secret|passwd|password|auth[_-]?token|access[_-]?token|private[_-]?key)\s*[:=]\s*["'][^"']{3,}["']/gi, severity: "high", category: "Security", title: "Possible hardcoded secret", detail: "Credentials in source leak via git history. Move to environment variables." },
  { langs: ["*"], pattern: /\b(TODO|FIXME|XXX|HACK)\b/g, severity: "low", category: "Quality", title: "Unresolved TODO/FIXME marker", detail: "Leftover work markers suggest unfinished work — track it or finish it.", max: 5 },
  { langs: ["*"], pattern: /SELECT\b[^;\n]*\+/gi, severity: "high", category: "Security", title: "SQL built with string concatenation", detail: "Concatenated SQL invites injection — use parameterized queries / prepared statements." },
  { langs: ["*"], pattern: /\b(Math\.random|random\.random)\s*\(/g, severity: "medium", category: "Security", title: "Weak randomness", detail: "Fine for games/UX, but never for tokens, passwords or security decisions — use a CSPRNG (crypto/secrets module)." },
  // ── JavaScript / TypeScript ──
  { langs: ["javascript", "typescript"], pattern: /\beval\s*\(/g, severity: "critical", category: "Security", title: "Use of eval()", detail: "eval() executes arbitrary strings — replace with JSON.parse or a safe parser." },
  { langs: ["javascript", "typescript"], pattern: /\bnew\s+Function\s*\(/g, severity: "high", category: "Security", title: "new Function() with dynamic code", detail: "Same injection risk as eval() — avoid building code from strings." },
  { langs: ["javascript", "typescript"], pattern: /\.innerHTML\s*=/g, severity: "high", category: "Security", title: "innerHTML assignment", detail: "Unsanitized HTML enables XSS — use textContent or a sanitizer." },
  { langs: ["javascript", "typescript"], pattern: /\.outerHTML\s*=/g, severity: "high", category: "Security", title: "outerHTML assignment", detail: "Same XSS risk as innerHTML — use textContent or a sanitizer." },
  { langs: ["javascript", "typescript"], pattern: /\.insertAdjacentHTML\s*\(/g, severity: "high", category: "Security", title: "insertAdjacentHTML()", detail: "Parses strings as HTML — XSS risk unless input is sanitized." },
  { langs: ["javascript", "typescript"], pattern: /dangerouslySetInnerHTML/g, severity: "high", category: "Security", title: "dangerouslySetInnerHTML", detail: "Bypasses React's XSS protection — sanitize the HTML first (e.g. DOMPurify)." },
  { langs: ["javascript", "typescript"], pattern: /\bv-html\s*=/g, severity: "high", category: "Security", title: "v-html binding", detail: "Renders raw HTML — XSS risk unless the content is sanitized." },
  { langs: ["javascript", "typescript"], pattern: /document\.write\s*\(/g, severity: "medium", category: "Security", title: "document.write()", detail: "Can open XSS holes and blocks rendering — use DOM APIs instead." },
  { langs: ["javascript", "typescript"], pattern: /\b(var)\s+\w+/g, severity: "low", category: "Quality", title: "var declaration", detail: "var is function-scoped and hoisted — prefer const/let." },
  { langs: ["javascript", "typescript"], pattern: /console\.log\s*\(/g, severity: "low", category: "Quality", title: "console.log left in code", detail: "Remove debug logging before shipping.", max: 5 },
  { langs: ["javascript", "typescript"], pattern: /\bdebugger\b/g, severity: "medium", category: "Bug risk", title: "debugger statement", detail: "Will pause execution in devtools — remove before shipping." },
  { langs: ["javascript", "typescript"], pattern: /require\s*\(\s*['"]child_process['"]\s*\)|from\s+['"]child_process['"]/g, severity: "high", category: "Security", title: "child_process usage", detail: "Shell execution from Node — never pass unsanitized input; prefer execFile with argv." },
  // ── Python ──
  { langs: ["python"], pattern: /\beval\s*\(/g, severity: "critical", category: "Security", title: "Use of eval()", detail: "Executes arbitrary code — use ast.literal_eval for literals." },
  { langs: ["python"], pattern: /\bexec\s*\(/g, severity: "critical", category: "Security", title: "Use of exec()", detail: "Executes arbitrary statements — refactor to avoid it." },
  { langs: ["python"], pattern: /pickle\.loads?\s*\(/g, severity: "high", category: "Security", title: "pickle deserialization", detail: "Untrusted pickles can execute code — use JSON instead." },
  { langs: ["python"], pattern: /shell\s*=\s*True/g, severity: "high", category: "Security", title: "subprocess with shell=True", detail: "Enables shell injection — pass argv lists with shell=False." },
  { langs: ["python"], pattern: /os\.system\s*\(/g, severity: "high", category: "Security", title: "os.system()", detail: "Spawns a shell — use subprocess with an argv list." },
  { langs: ["python"], pattern: /os\.popen\s*\(/g, severity: "high", category: "Security", title: "os.popen()", detail: "Spawns a shell — use subprocess with an argv list." },
  { langs: ["python"], pattern: /verify\s*=\s*False/g, severity: "high", category: "Security", title: "TLS verification disabled", detail: "Exposes traffic to MITM — keep verification enabled." },
  { langs: ["python"], pattern: /yaml\.load\s*\([^)]*\)/g, severity: "medium", category: "Security", title: "yaml.load without Loader", detail: "Can construct arbitrary objects — use yaml.safe_load." },
  { langs: ["python"], pattern: /hashlib\.(md5|sha1)\s*\(/g, severity: "medium", category: "Security", title: "Weak hash (MD5/SHA-1)", detail: "Broken for passwords/signatures — use SHA-256 or bcrypt/argon2 for passwords." },
  { langs: ["python"], pattern: /tempfile\.mktemp\s*\(/g, severity: "medium", category: "Security", title: "tempfile.mktemp()", detail: "Insecure temp files (race condition) — use mkstemp or TemporaryFile." },
  { langs: ["python"], pattern: /^\s*except\s*:/gm, severity: "medium", category: "Bug risk", title: "Bare except:", detail: "Swallows KeyboardInterrupt/SystemExit and hides bugs — catch specific exceptions." },
  { langs: ["python"], pattern: /\bassert\s+/g, severity: "low", category: "Quality", title: "assert for validation", detail: "Asserts vanish with -O — raise proper exceptions for runtime checks." },
  // ── Java / Kotlin ──
  { langs: ["java", "kotlin"], pattern: /Runtime\.getRuntime\(\)\.exec\s*\(/g, severity: "high", category: "Security", title: "Runtime.exec()", detail: "Command injection risk — validate/allow-list arguments." },
  { langs: ["java", "kotlin"], pattern: /readObject\s*\(/g, severity: "high", category: "Security", title: "Java deserialization (readObject)", detail: "Untrusted serialized data can execute code — validate classes or avoid native serialization." },
  { langs: ["java", "kotlin"], pattern: /MessageDigest\.getInstance\s*\(\s*"(MD5|SHA-?1)"\s*\)/g, severity: "medium", category: "Security", title: "Weak hash (MD5/SHA-1)", detail: "Broken for passwords/signatures — use SHA-256+ or bcrypt/argon2." },
  { langs: ["java"], pattern: /createStatement\s*\(/g, severity: "medium", category: "Security", title: "Raw SQL Statement", detail: "String-built SQL invites injection — use PreparedStatement." },
  { langs: ["java"], pattern: /printStackTrace\s*\(\)/g, severity: "low", category: "Quality", title: "printStackTrace()", detail: "Leaks internals to logs — use a logger with levels." },
  { langs: ["java"], pattern: /"\s*==|==\s*"/g, severity: "medium", category: "Bug risk", title: "== for String comparison", detail: "== compares references, not content — use .equals() for strings." },
  // ── C / C++ ──
  { langs: ["c", "cpp"], pattern: /\bgets\s*\(/g, severity: "critical", category: "Security", title: "gets() — buffer overflow", detail: "gets() cannot be used safely (removed from C11) — use fgets with a size limit." },
  { langs: ["c", "cpp"], pattern: /\b(strcpy|strcat|sprintf)\s*\(/g, severity: "high", category: "Security", title: "Unbounded copy (strcpy/strcat/sprintf)", detail: "Classic buffer overflow source — use strncpy/strncat/snprintf with explicit bounds." },
  { langs: ["c", "cpp"], pattern: /\bsystem\s*\(/g, severity: "high", category: "Security", title: "system()", detail: "Spawns a shell — command injection risk; prefer exec-family with argv." },
  { langs: ["c", "cpp"], pattern: /scanf\s*\([^)]*"%s"/g, severity: "high", category: "Security", title: 'scanf("%s") without width', detail: "Unbounded write into the buffer — add a width like %63s." },
  // ── Go ──
  { langs: ["go"], pattern: /\brand\.(Intn|Int63|Float64|Seed|Int31)\s*\(/g, severity: "medium", category: "Security", title: "math/rand for sensitive values", detail: "Not cryptographically secure — use crypto/rand for tokens/keys." },
  { langs: ["go"], pattern: /\bpanic\s*\(/g, severity: "low", category: "Quality", title: "panic() in code path", detail: "panics crash the process — return errors in libraries/handlers.", max: 5 },
  { langs: ["go"], pattern: /md5\.New\(\)|sha1\.New\(\)/g, severity: "medium", category: "Security", title: "Weak hash (MD5/SHA-1)", detail: "Broken for passwords/signatures — use SHA-256+ or bcrypt." },
  // ── Ruby ──
  { langs: ["ruby"], pattern: /\beval\s*\(/g, severity: "critical", category: "Security", title: "Use of eval()", detail: "Executes arbitrary code — refactor to avoid it." },
  { langs: ["ruby"], pattern: /Marshal\.load\s*\(/g, severity: "high", category: "Security", title: "Marshal.load on untrusted data", detail: "Can instantiate arbitrary objects — avoid with untrusted input." },
  { langs: ["ruby"], pattern: /(`[^`]*\$\{|%x\{|\bsystem\s*\()/g, severity: "high", category: "Security", title: "Shell execution", detail: "Shell interpolation with user data enables command injection — sanitize first." },
  // ── C# ──
  { langs: ["csharp"], pattern: /BinaryFormatter/g, severity: "high", category: "Security", title: "BinaryFormatter", detail: "Insecure deserializer (do not use) — migrate to JSON/System.Text.Json." },
  { langs: ["csharp"], pattern: /Process\.Start\s*\(/g, severity: "medium", category: "Security", title: "Process.Start()", detail: "Command injection risk with dynamic input — validate/allow-list arguments." },
  { langs: ["csharp"], pattern: /(MD5|SHA1)\.Create\s*\(\)/g, severity: "medium", category: "Security", title: "Weak hash (MD5/SHA-1)", detail: "Broken for passwords/signatures — use SHA-256+ or bcrypt." },
  // ── PHP ──
  { langs: ["php"], pattern: /\beval\s*\(/g, severity: "critical", category: "Security", title: "Use of eval()", detail: "Executes arbitrary code — refactor to avoid it." },
  { langs: ["php"], pattern: /\b(system|exec|shell_exec|passthru)\s*\(/g, severity: "high", category: "Security", title: "Shell execution function", detail: "Command injection risk — escape with escapeshellarg or avoid." },
  { langs: ["php"], pattern: /\bmysql_query\s*\(/g, severity: "high", category: "Security", title: "mysql_query (removed API)", detail: "Removed in PHP 7 and injection-prone — use PDO with prepared statements." },
  { langs: ["php"], pattern: /\bunserialize\s*\(/g, severity: "high", category: "Security", title: "unserialize() on input", detail: "PHP object injection risk — use JSON or allowed_classes restriction." },
  { langs: ["php"], pattern: /echo\s+\$_(GET|POST|REQUEST|COOKIE)/g, severity: "medium", category: "Security", title: "Unescaped request output", detail: "Reflected XSS — escape with htmlspecialchars()." },
  { langs: ["php"], pattern: /\bmd5\s*\(/g, severity: "medium", category: "Security", title: "md5() for passwords", detail: "Too fast/broken for passwords — use password_hash()/password_verify()." },
  // ── Logic bugs (heuristics that catch real defects, not just smells) ──
  { langs: ["javascript", "typescript", "java", "csharp"], pattern: /for\s*\([^;]*;\s*\w+\s*<=\s*\w+\.length/g, severity: "high", category: "Bug risk", title: "Off-by-one: <= .length", detail: "Indexes run 0..length-1, so <= length reads one past the end — use < ." },
  { langs: ["go"], pattern: /for\s*\w+\s*:?=\s*0\s*;\s*\w+\s*<=\s*len\s*\(/g, severity: "high", category: "Bug risk", title: "Off-by-one: <= len()", detail: "Indexes run 0..len-1, so <= len panics — use < len." },
  { langs: ["python"], pattern: /<=\s*len\s*\(/g, severity: "high", category: "Bug risk", title: "Off-by-one: <= len()", detail: "Indexes run 0..len-1 — <= len raises IndexError. Use < len or iterate directly." },
  { langs: ["javascript", "typescript"], pattern: /===\s*NaN\b|\bNaN\s*===/g, severity: "high", category: "Bug risk", title: "NaN comparison always false", detail: "NaN !== NaN by definition — use Number.isNaN() instead." },
  { langs: ["python"], pattern: /def\s+\w+\s*\([^()]*=\s*(\[\]|\{\})/g, severity: "high", category: "Bug risk", title: "Mutable default argument", detail: "The list/dict is shared across calls — default to None and create it inside." },
  { langs: ["python"], pattern: /\bis\s+("[^"]*"|'[^']*'|\d+)/g, severity: "medium", category: "Bug risk", title: "is used for value comparison", detail: "`is` checks identity, not equality — use == for values." },
  { langs: ["python"], pattern: /range\s*\(\s*len\s*\(/g, severity: "low", category: "Quality", title: "range(len(...))", detail: "Unidiomatic and error-prone — use enumerate() instead.", max: 5 },
  { langs: ["python"], pattern: /\bexcept\b[^:]*:\s*pass\b/g, severity: "medium", category: "Bug risk", title: "Swallowed exception", detail: "except: pass hides every failure — log it or handle specific errors." },
  { langs: ["javascript", "typescript", "java"], pattern: /parseInt\s*\([^(),]+\)/g, severity: "low", category: "Quality", title: "parseInt without radix", detail: "Leading zeros can trigger octal parsing — pass 10 explicitly." },
];
export function staticReview(code: string, language: string): StaticFinding[] {
  const out: StaticFinding[] = [];
  if (!code.trim()) return out;
  const lang = (language || "").toLowerCase();
  for (const rule of STATIC_RULES) {
    if (!rule.langs.includes("*") && !rule.langs.includes(lang)) continue;
    // Fresh regex per use so shared global patterns don't carry lastIndex state.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`);
    let count = 0;
    const cap = rule.max ?? 3;
    for (const m of code.matchAll(re)) {
      if (typeof m.index !== "number") continue;
      out.push({ severity: rule.severity, category: rule.category, title: rule.title, detail: rule.detail, line: lineOf(code, m.index) });
      if (++count >= cap) break;
    }
  }
  // Loose == scanner (JS/TS): report every == that isn't === / !== / ==>.
  if (lang === "javascript" || lang === "typescript") {
    let found = 0;
    const re = /==/g;
    for (const m of code.matchAll(re)) {
      const i = m.index ?? -1;
      if (i < 0) continue;
      const prev = i > 0 ? code[i - 1] : "";
      const next2 = code[i + 2] ?? "";
      if (prev === "=" || prev === "!" || prev === "<" || prev === ">" || next2 === "=" || next2 === ">") continue;
      out.push({ severity: "medium", category: "Bug risk", title: "Loose equality ==", detail: "== coerces types and causes subtle bugs — prefer === / !==.", line: lineOf(code, i) });
      if (++found >= 5) break;
    }
  }
  // Assignment inside if/while condition (= instead of ==). Applies to
  // brace languages where this is virtually always a bug (PHP excluded:
  // `if ($row = fetch())` is idiomatic there). Handles nested parens like
  // `while (u.n = next())` via balanced-paren scanning.
  if (["javascript", "typescript", "c", "cpp", "java", "csharp", "go"].includes(lang)) {
    let assignFound = 0;
    const condRe = /\b(if|while)\s*\(/g;
    let cm: RegExpExecArray | null;
    while ((cm = condRe.exec(code)) !== null && assignFound < 3) {
      // Find matching close paren (quote-aware).
      let depth = 0;
      let q: string | null = null;
      let esc = false;
      let end = -1;
      const openIdx = cm.index + cm[0].length - 1;
      for (let k = openIdx; k < code.length; k++) {
        const ch = code[k];
        if (esc) {
          esc = false;
          continue;
        }
        if (ch === "\\") {
          if (q) esc = true;
          continue;
        }
        if (q) {
          if (ch === q) q = null;
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          q = ch;
          continue;
        }
        if (ch === "(") depth++;
        else if (ch === ")") {
          depth--;
          if (depth === 0) {
            end = k;
            break;
          }
        }
      }
      if (end < 0) continue;
      const inner = code.slice(openIdx + 1, end);
      for (const eq of inner.matchAll(/=/g)) {
        const j = eq.index ?? -1;
        if (j < 0) continue;
        const prev = j > 0 ? inner[j - 1] : "";
        const next = inner[j + 1] ?? "";
        if (prev === "=" || prev === "!" || prev === "<" || prev === ">" || next === "=" || next === ">") continue;
        out.push({ severity: "high", category: "Bug risk", title: "Assignment in condition (= vs ==)", detail: "This assigns instead of comparing — the branch is almost never what you meant. Use == / ===.", line: lineOf(code, openIdx + 1 + j) });
        if (++assignFound >= 3) break;
      }
    }
  }
  // JSON.parse without any try/catch in the snippet.
  if ((lang === "javascript" || lang === "typescript") && /JSON\.parse\s*\(/.test(code) && !/\btry\s*\{/.test(code)) {
    const m = /JSON\.parse\s*\(/.exec(code)!;
    out.push({ severity: "medium", category: "Bug risk", title: "JSON.parse without try/catch", detail: "JSON.parse throws on malformed input — wrap it so one bad payload can't crash you.", line: lineOf(code, m.index) });
  }
  // fetch() with no .catch and no try/catch anywhere.
  if ((lang === "javascript" || lang === "typescript") && /\bfetch\s*\(/.test(code) && !/\.catch\s*\(/.test(code) && !/\btry\s*\{/.test(code)) {
    const m = /\bfetch\s*\(/.exec(code)!;
    out.push({ severity: "low", category: "Bug risk", title: "fetch() without error handling", detail: "Network failures reject the promise — add .catch() or try/catch.", line: lineOf(code, m.index) });
  }
  // async with no await anywhere.
  if ((lang === "javascript" || lang === "typescript") && /\basync\b/.test(code) && !/\bawait\b/.test(code)) {
    const m = /\basync\b/.exec(code)!;
    out.push({ severity: "low", category: "Quality", title: "async without await", detail: "No await found — either an await is missing or async is unnecessary. (Ignore if intentionally returning a promise.)", line: lineOf(code, m.index) });
  }
  // open() without with in Python.
  if (lang === "python" && /\bopen\s*\(/.test(code) && !/^\s*with\b/m.test(code)) {
    const m = /\bopen\s*\(/.exec(code)!;
    out.push({ severity: "medium", category: "Bug risk", title: "open() without `with`", detail: "An exception leaks the file handle — use `with open(...) as f:`.", line: lineOf(code, m.index) });
  }
  // Very long lines (report up to 3).
  const lines = code.split("\n");
  let longCount = 0;
  lines.forEach((l, idx) => {
    if (l.length > 120 && longCount < 3) {
      out.push({ severity: "low", category: "Quality", title: `Line ${idx + 1} exceeds 120 characters`, detail: "Long lines hurt readability — break them up.", line: idx + 1 });
      longCount++;
    }
  });
  // Debug order: walk the code top-to-bottom like a debugger would.
  out.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
  return out.slice(0, 24);
}

/* ── Samples ── */
const SAMPLE_JS = `// Sample: spot the problems, then hit "Review Code"
const API_KEY = "sk-live-abc123xyz";
function getUser(id) {
  var query = "SELECT * FROM users WHERE id = " + id;
  return query;
}
function render(name) {
  document.getElementById("app").innerHTML = "<h1>Hello " + name + "</h1>";
  console.log("rendered", name);
}
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}`;
const SAMPLE_PY = `# Sample: spot the problems, then hit "Review Code"
import pickle, subprocess

API_KEY = "sk-live-abc123xyz"

def load_user(blob):
    return pickle.loads(blob)

def run_cmd(name):
    subprocess.call("ls " + name, shell=True)

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

try:
    print(fib(30))
except:
    pass`;

/* ── Review fetching (primary /ai/review, fallback /ai/insights) ── */
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const tok = localStorage.getItem("auth_token");
    if (tok) h["Authorization"] = `Bearer ${tok}`;
    const sess = localStorage.getItem("deviq_session");
    if (sess) {
      const email = JSON.parse(sess)?.email;
      if (email) h["x-user-email"] = email;
    }
  } catch {
    /* ignore */
  }
  return h;
}

export function extractJson(text: string): Record<string, unknown> {
  let cleaned = (text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }
  try {
    const p = JSON.parse(cleaned);
    if (p && typeof p === "object") return p as Record<string, unknown>;
  } catch {
    /* try block extraction */
  }
  try {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const p = JSON.parse(cleaned.slice(start, end + 1));
      if (p && typeof p === "object") return p as Record<string, unknown>;
    }
  } catch {
    /* fall through to salvage */
  }
  return salvageTruncatedJson(cleaned);
}

/* AI responses are often cut off mid-JSON by token limits. Salvage every
 * complete item: cut the tail back to the last finished object/array,
 * auto-close the remaining brackets, and parse that. A partial list of
 * real bugs beats an empty "no bugs found". */
export function salvageTruncatedJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  if (start < 0) return {};
  const body = text.slice(start);
  // Candidate cut points: each drops the incomplete tail a bit further.
  const cuts: number[] = [body.length];
  let idx = body.length;
  for (let i = 0; i < 10; i++) {
    const c1 = body.lastIndexOf("},", idx - 1);
    const c2 = body.lastIndexOf("],", idx - 1);
    const cut = Math.max(c1 === -1 ? -1 : c1 + 2, c2 === -1 ? -1 : c2 + 2);
    if (cut <= 0) break;
    cuts.push(cut);
    idx = cut - 1;
  }
  for (const cut of cuts) {
    const candidate = closeBrackets(body.slice(0, cut));
    if (!candidate) continue;
    try {
      const p = JSON.parse(candidate);
      if (p && typeof p === "object" && Object.keys(p).length > 0) {
        return p as Record<string, unknown>;
      }
    } catch {
      /* try shorter cut */
    }
  }
  return {};
}

/* String-aware bracket auto-closer: counts unclosed { and [ outside of
 * string literals, drops a dangling partial string, closes the rest. */
function closeBrackets(s: string): string | null {
  let out = s;
  // Drop a trailing unterminated string: odd number of unescaped quotes.
  let inStr = false;
  let esc = false;
  for (const ch of out) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      if (inStr) esc = true;
      continue;
    }
    if (ch === '"') inStr = !inStr;
  }
  if (inStr) {
    const li = out.lastIndexOf('"');
    if (li <= 0) return null;
    out = out.slice(0, li);
  }
  // Re-scan for depth.
  inStr = false;
  esc = false;
  const stack: string[] = [];
  for (const ch of out) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      if (inStr) esc = true;
      continue;
    }
    if (ch === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      else return null; // unbalanced — try a shorter cut
    }
  }
  // Trailing commas before a closer are invalid JSON — remove them.
  out = out.replace(/,\s*$/, "");
  while (stack.length) out += stack.pop();
  return out;
}

export function normalizeReview(parsed: Record<string, unknown>, rawFallback: string): ReviewResult {
  const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const asCx = (v: unknown): { value: string; explanation: string } => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return { value: String(o.value ?? o.complexity ?? "—"), explanation: String(o.explanation ?? o.why ?? o.reason ?? "") };
    }
    return { value: String(v ?? "—"), explanation: "" };
  };
  // Models often rename keys (e.g. "type" instead of "severity", "issue"
  // instead of "title"). Accept the common variants so real findings are
  // never dropped just because of a key name.
  const pick = (o: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const k of keys) {
      const v = o[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const asImprovements = (v: unknown): string[] =>
    asList(v).map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const title = pick(o, "title", "name", "t");
        const detail = pick(o, "detail", "feedback", "description", "message", "d", "c");
        const line = pick(o, "line", "lineNumber", "l");
        const parts = [
          title !== undefined ? String(title) : "",
          detail !== undefined ? String(detail) : "",
        ].filter(Boolean);
        const text = parts.join(" — ") || JSON.stringify(item);
        return typeof line === "number" ? `${text} (line ${line})` : text;
      }
      return String(item);
    });
  const asBugs = (v: unknown): ReviewBug[] =>
    asList(v).map((item) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const lineRaw = pick(o, "line", "lineNumber", "loc", "l");
        const confRaw = pick(o, "confidence", "certainty", "cf");
        return {
          severity: String(pick(o, "severity", "level", "type", "priority", "s") ?? "medium").toLowerCase(),
          title: String(pick(o, "title", "name", "issue", "bug", "finding", "t") ?? "Issue"),
          detail: String(pick(o, "detail", "description", "message", "why", "explanation", "d") ?? ""),
          line: typeof lineRaw === "number" && Number.isFinite(lineRaw) ? lineRaw : null,
          category: (() => { const c = pick(o, "category", "kind", "class", "c"); return c === undefined ? undefined : String(c); })(),
          trigger: (() => { const t = pick(o, "trigger", "repro", "reproduction", "input", "when", "tr"); return t === undefined ? undefined : String(t); })(),
          expected: (() => { const e = pick(o, "expected", "expected_behavior", "ex"); return e === undefined ? undefined : String(e); })(),
          actual: (() => { const a = pick(o, "actual", "actual_behavior", "ac"); return a === undefined ? undefined : String(a); })(),
          fix: (() => { const f = pick(o, "fix", "fix_explanation", "solution", "correction", "corrected_code", "f"); return f === undefined ? undefined : String(f); })(),
          confidence: typeof confRaw === "number" && Number.isFinite(confRaw)
            ? Math.max(0, Math.min(100, Math.round(confRaw)))
            : null,
        };
      }
      return { severity: "medium", title: String(item), detail: "", line: null };
    });
  const asWarnings = (v: unknown): ReviewWarning[] =>
    asBugs(v).map((b) => ({ severity: b.severity, title: b.title, detail: b.detail, line: b.line }));
  const asSec = (v: unknown): ReviewSecurity[] =>
    asList(v).map((item) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return {
          severity: String(pick(o, "severity", "level", "type", "priority", "s") ?? "medium").toLowerCase(),
          title: String(pick(o, "title", "name", "issue", "finding", "t") ?? "Issue"),
          detail: String(pick(o, "detail", "description", "message", "risk", "why", "d") ?? ""),
          fix: (() => {
            const f = pick(o, "fix", "solution", "remediation", "recommendation", "how_to_fix", "f");
            return f === undefined ? undefined : String(f);
          })(),
        };
      }
      return { severity: "medium", title: String(item), detail: "" };
    });
  const asQual = (v: unknown): ReviewQuality[] =>
    asList(v).map((item) => {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        return {
          area: String(pick(o, "area", "category", "aspect", "topic", "a") ?? "general"),
          feedback: String(pick(o, "feedback", "comment", "observation", "detail", "message", "c") ?? ""),
        };
      }
      return { area: "general", feedback: String(item) };
    });
  let score: number | null = null;
  const summaryRaw = parsed.summary;
  const summaryText =
    summaryRaw && typeof summaryRaw === "object"
      ? String((summaryRaw as Record<string, unknown>).text ?? "")
      : String(summaryRaw ?? parsed.overview ?? "");
  const summaryScore =
    summaryRaw && typeof summaryRaw === "object"
      ? (summaryRaw as Record<string, unknown>).score
      : undefined;
  const rawScore = typeof parsed.score === "number" ? parsed.score : summaryScore;
  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    score = Math.max(0, Math.min(100, Math.round(rawScore)));
  }
  const cxBlock =
    parsed.complexity && typeof parsed.complexity === "object"
      ? (parsed.complexity as Record<string, unknown>)
      : {};
  const repairBlock =
    parsed.repair && typeof parsed.repair === "object"
      ? (parsed.repair as Record<string, unknown>)
      : {};
  const fixedRaw =
    typeof parsed.fixed_code === "string" ? parsed.fixed_code : repairBlock.fixed_code;
  return {
    summary: summaryText || rawFallback.slice(0, 800) || "",
    score,
    bugs: asBugs(parsed.bugs ?? parsed.issues),
    warnings: asWarnings(
      parsed.warnings ?? parsed.potential_issues ?? parsed.risks ?? parsed.edge_cases ?? parsed.possible_bugs
    ),
    time_complexity: asCx(parsed.time_complexity ?? parsed.time ?? cxBlock.time),
    space_complexity: asCx(parsed.space_complexity ?? parsed.space ?? cxBlock.space),
    security: asSec(parsed.security ?? parsed.security_issues ?? parsed.vulnerabilities),
    quality: asQual(parsed.quality ?? parsed.code_quality),
    improvements: (() => {
      // "suggestions" (rich engine schema) feeds the same card when the
      // backend doesn't also return plain "improvements".
      const _imp = asImprovements(parsed.improvements);
      return _imp.length > 0 ? _imp : asImprovements(parsed.suggestions);
    })(),
    fixed_code: typeof fixedRaw === "string" ? fixedRaw : null,
    repair_strategy:
      typeof parsed.repair_strategy === "string"
        ? parsed.repair_strategy
        : typeof repairBlock.strategy === "string"
          ? repairBlock.strategy
          : null,
    partial: Array.isArray(parsed.partial) ? parsed.partial.map(String) : [],
    fixed_truncated: parsed.fixed_truncated === true,
  };
}

async function insightsCall(prompt: string, minChars = 20, tries = 2): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt < tries; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    try {
      const r = await fetch(`${BACKEND}/ai/insights`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ prompt }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        // Rate-limited: retrying only burns more quota — fail fast.
        let body = "";
        try {
          body = await r.text();
        } catch {
          /* ignore */
        }
        if (r.status === 429 || /rate.?limit|quota|too many requests/i.test(body)) {
          throw new Error("RATE_LIMITED");
        }
        continue;
      }
      const data = await r.json();
      last = String(data?.result ?? "").trim();
      if (last.length >= minChars) return last;
      // Empty/stub response — transient model flake, retry.
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
      /* network blip / timeout — retry */
    } finally {
      clearTimeout(timer);
    }
  }
  if (last) return last;
  throw new Error(`AI request failed`);
}

export function stripFences(text: string): string {
  const t = (text || "").trim();
  if (!t.startsWith("```")) return t;
  return t.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "").trim();
}

/* Fallback for older backend deploys without /ai/review: the generic
 * endpoint's output budget is tiny and varies per call, so one giant review
 * JSON almost always arrives truncated. Strategy: FIVE small parallel
 * section calls (each fits the budget) + retry any section that arrives
 * incomplete + salvage-parse whatever survives. */
function countItems(p: Record<string, unknown>): number {
  let n = 0;
  for (const k of ["bugs", "warnings", "security", "quality", "improvements"]) {
    const v = p[k];
    if (Array.isArray(v)) n += v.length;
  }
  return n;
}

async function insightsJson(prompt: string): Promise<{ data: Record<string, unknown>; complete: boolean }> {
  let best: Record<string, unknown> = {};
  let bestItems = -1;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
    let raw = "";
    try {
      raw = await insightsCall(prompt);
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
      continue;
    }
    const clean = stripFences(raw.trim());
    try {
      const p = JSON.parse(clean);
      if (p && typeof p === "object" && Object.keys(p).length > 0) {
        return { data: p as Record<string, unknown>, complete: true }; // complete — done
      }
    } catch {
      /* truncated — salvage below */
    }
    const salv = salvageTruncatedJson(clean);
    const items = countItems(salv);
    if (items > bestItems) {
      best = salv;
      bestItems = items;
    }
    if (items > 0 && attempt >= 1) break; // have something; stop burning time
  }
  return { data: best, complete: false };
}

/* A fixed program is only useful if it is WHOLE. The model sometimes stops
 * mid-file, so validate delimiter balance and retry; keep the longest
 * balanced answer, otherwise flag truncation so the UI says so. */
export function isCodeComplete(code: string): boolean {
  const src = (code || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
  let inStr: string | null = null;
  let esc = false;
  const stack: string[] = [];
  const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
  for (const ch of src) {
    if (esc) {
      esc = false;
      continue;
    }
    if (ch === "\\") {
      if (inStr) esc = true;
      continue;
    }
    if (inStr) {
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      continue;
    }
    if (pairs[ch]) stack.push(pairs[ch]);
    else if (ch === "}" || ch === ")" || ch === "]") {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop();
      else return false;
    }
  }
  if (inStr || stack.length > 0) return false;
  // Trailing operator/opener/quote means the file was cut mid-statement.
  const tail = src.trimEnd();
  if (!tail) return false;
  const lastCh = tail[tail.length - 1];
  return ![":", ",", "-", "+", "*", "/", "%", "=", "<", ">", "\\", "(", "&", "[", "{", "'", '"', "`"].includes(lastCh);
}

const FIX_PROMPT = (language: string, ctx: string) =>
  `Return ONLY the corrected ${language} code for the code below — no explanations, no markdown fences. Fix bugs and security issues, keep behavior identical, do not add comments. If nothing material to fix, reply with exactly: NO_FIX\n\n${ctx}`;

export async function requestFix(
  code: string,
  language: string
): Promise<{ code: string | null; truncated: boolean }> {
  const ctx = `Language: ${language}\nCode:\n${code}`;
  let best: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
    let raw = "";
    try {
      raw = await insightsCall(FIX_PROMPT(language, ctx), 5);
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") throw e;
      continue;
    }
    const stripped = stripFences(raw).slice(0, 6000);
    if (!stripped || stripped === "NO_FIX") continue;
    if (isCodeComplete(stripped)) return { code: stripped, truncated: false };
    if (!best || stripped.length > best.length) best = stripped;
  }
  return { code: best, truncated: best !== null };
}

type SectionKey = "bugs" | "complexity" | "security" | "quality";
const SECTION_STAGE: Record<SectionKey, string> = {
  bugs: "Checking for bugs…",
  complexity: "Estimating complexity…",
  security: "Auditing security…",
  quality: "Grading quality…",
};
function sectionPrompt(key: SectionKey, language: string, ctx: string): string {
  switch (key) {
    case "bugs":
      return `You are a senior debugging engine. PHASE 1: read the ENTIRE ${language} program — control/data flow, every function, loop, condition, exception path; normal, invalid, empty, boundary, null inputs. PHASE 2: prove EVERY suspected bug (exact line, execution path, triggering input, actual vs expected) — unprovable issues go to warnings[], never bugs[]. No invented bugs, no inflated counts, no style issues as bugs. PHASE 3: second pass for missed bugs. JSON ONLY, no fences, short keys: {"summary":"1 sentence","score":0-100,"bugs":[{"s":"HIGH|MEDIUM|LOW","t":"title","l":line,"c":"category","d":"what+why <15 words","tr":"trigger","ex":"expected","ac":"actual","f":"fix","cf":0-100}],"warnings":[{"s":"WARNING","t":"..","l":line,"d":".."}]} max 6 bugs, max 5 warnings, terse. ALWAYS close all brackets.\n\n${ctx}`;
    case "complexity":
      return `Complexity of this ${language} code. JSON ONLY, no fences: {"time_complexity":{"value":"e.g. O(n log n)","explanation":"under 12 words"},"space_complexity":{"value":"e.g. O(n)","explanation":"under 12 words"}}\n\n${ctx}`;
    case "security":
      return `Security audit of this ${language} code: injection, XSS, secrets, weak crypto, auth flaws, deserialization, command execution. JSON ONLY, no fences, short keys: {"security":[{"s":"critical|high|medium|low","t":"title","d":"risk","f":"fix"}]} max 5, terse. ALWAYS close all brackets.\n\n${ctx}`;
    case "quality":
      return `Quality review of this ${language} code. JSON ONLY, no fences, short keys: {"quality":[{"a":"area","c":"comment"}],"improvements":["concrete suggestion","max 4"]} max 4 quality items, terse. ALWAYS close all brackets.\n\n${ctx}`;
  }
}

interface SectionOut {
  key: SectionKey;
  res: { data: Record<string, unknown>; complete: boolean };
}

/* Sequential with gentle pacing: parallel bursts demonstrably degrade the
 * shared AI backend (truncated/empty answers). One focused call at a time. */
async function runSections(
  code: string,
  language: string,
  keys: SectionKey[],
  onStage?: (stage: string) => void
): Promise<SectionOut[]> {
  const ctx = `Language: ${language}\nCode:\n${code}`;
  const out: SectionOut[] = [];
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 900));
    onStage?.(SECTION_STAGE[keys[i]]);
    out.push({ key: keys[i], res: await insightsJson(sectionPrompt(keys[i], language, ctx)) });
  }
  return out;
}

function assembleSections(outs: SectionOut[]): { result: ReviewResult; verified: string[] } {
  const byKey = (k: SectionKey) => outs.find((o) => o.key === k)?.res ?? { data: {}, complete: false };
  const bugsR = byKey("bugs");
  const cxR = byKey("complexity");
  const secR = byKey("security");
  const qualR = byKey("quality");
  const partial: string[] = [];
  const verified: string[] = [];
  const track = (key: string, res: { data: Record<string, unknown>; complete: boolean }, present: boolean) => {
    if (res.complete) verified.push(key);
    else if (!present) partial.push(key);
  };
  const empty: ReviewResult = {
    summary: "",
    score: null,
    bugs: [],
    warnings: [],
    time_complexity: { value: "—", explanation: "" },
    space_complexity: { value: "—", explanation: "" },
    security: [],
    quality: [],
    improvements: [],
    fixed_code: null,
    fixed_truncated: false,
    partial: [],
  };
  const nb = normalizeReview(bugsR.data, "");
  empty.summary = nb.summary;
  empty.score = nb.score;
  empty.bugs = nb.bugs;
  empty.warnings = nb.warnings;
  const nc = normalizeReview(cxR.data, "");
  if (nc.time_complexity.value !== "—") empty.time_complexity = nc.time_complexity;
  if (nc.space_complexity.value !== "—") empty.space_complexity = nc.space_complexity;
  empty.security = normalizeReview(secR.data, "").security;
  const nq = normalizeReview(qualR.data, "");
  empty.quality = nq.quality;
  empty.improvements = nq.improvements;
  track("bugs", bugsR, empty.bugs.length > 0 || empty.warnings.length > 0);
  track("complexity", cxR, empty.time_complexity.value !== "—");
  track("security", secR, empty.security.length > 0);
  track("quality", qualR, empty.quality.length > 0 || empty.improvements.length > 0);
  empty.partial = partial;
  if (!empty.summary) empty.summary = "Review completed with limited detail.";
  return { result: empty, verified };
}

/* Targeted retry of only the failed sections — merges into existing results
 * via the component. Returns sparse data plus which keys got verified. */
export async function retryReviewSections(
  code: string,
  language: string,
  keys: SectionKey[],
  onStage?: (stage: string) => void
): Promise<{ result: ReviewResult; verified: string[] }> {
  try {
    const outs = await runSections(code, language, keys, onStage);
    return assembleSections(outs);
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      throw new Error(
        "DevIQ's AI is at capacity right now (rate limit). Wait a minute or two and retry."
      );
    }
    throw e;
  }
}

export async function fallbackReview(
  code: string,
  language: string,
  onStage?: (stage: string) => void
): Promise<ReviewResult> {
  const ALL: SectionKey[] = ["bugs", "complexity", "security", "quality"];
  let outs: SectionOut[];
  try {
    outs = await runSections(code, language, ALL, onStage);
  } catch (e) {
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      throw new Error(
        "DevIQ's AI is at capacity right now (rate limit). Wait a minute or two and press Review again."
      );
    }
    throw e;
  }
  let assembled = assembleSections(outs);
  const gotAnything =
    assembled.result.bugs.length > 0 ||
    assembled.result.warnings.length > 0 ||
    assembled.result.security.length > 0 ||
    assembled.result.quality.length > 0 ||
    assembled.result.improvements.length > 0 ||
    assembled.result.time_complexity.value !== "—";
  // Heal transient flakes automatically: if some sections came back
  // unverified, re-run just those once instead of showing notices.
  if (gotAnything && (assembled.result.partial ?? []).length > 0) {
    onStage?.("Retrying incomplete checks…");
    const missing = (assembled.result.partial ?? []).filter((k): k is SectionKey =>
      (["bugs", "complexity", "security", "quality"] as string[]).includes(k)
    );
    const retryOuts = await runSections(code, language, missing, onStage);
    const byKey = new Map(retryOuts.map((o) => [o.key, o.res] as const));
    outs = outs.map((o) => (byKey.has(o.key) ? { key: o.key, res: byKey.get(o.key)! } : o));
    assembled = assembleSections(outs);
  }

  onStage?.("Writing fixes…");
  const fixRes = await requestFix(code, language);

  if (
    assembled.result.bugs.length === 0 &&
    assembled.result.warnings.length === 0 &&
    assembled.result.security.length === 0 &&
    assembled.result.quality.length === 0 &&
    assembled.result.improvements.length === 0 &&
    assembled.result.time_complexity.value === "—" &&
    !fixRes.code
  ) {
    throw new Error("AI review is unavailable right now. Try again in a moment.");
  }

  const empty = assembled.result;
  if (fixRes.code) {
    empty.fixed_code = fixRes.code;
    empty.fixed_truncated = fixRes.truncated;
  }
  return empty;
}

async function requestReview(
  code: string,
  language: string,
  onStage?: (stage: string) => void
): Promise<ReviewResult> {
  // Primary: dedicated structured endpoint.
  try {
    const r = await fetch(`${BACKEND}/ai/review`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ code, language }),
    });
    if (r.ok) {
      const data = await r.json();
      if (data && (data.summary || data.bugs || data.status === "success" || data.status === "partial")) {
        return normalizeReview(data as Record<string, unknown>, "");
      }
      throw new Error("Unexpected review response");
    }
    throw new Error(`review endpoint ${r.status}`);
  } catch (primaryErr) {
    // Fallback: generic insights endpoint (works on older backend deploys).
    try {
      return await fallbackReview(code, language, onStage);
    } catch (e) {
      if (e instanceof Error && /rate.?limit|at capacity/i.test(e.message)) throw e;
      const offline =
        primaryErr instanceof TypeError || String(primaryErr).includes("fetch");
      throw new Error(
        offline
          ? "Could not reach the AI backend. Check your connection and try again."
          : "AI review is unavailable right now. Try again in a moment."
      );
    }
  }
}

/* ── Optimization fetching (primary /ai/optimize, fallback /ai/insights) ── */
export function normalizeOptimization(parsed: Record<string, unknown>): OptimizationResult {
  const asCx = (v: unknown): ComplexityPoint => {
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return { value: String(o.value ?? o.complexity ?? "—"), explanation: String(o.explanation ?? o.why ?? o.reason ?? "") };
    }
    return { value: String(v ?? "—"), explanation: "" };
  };
  const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const pick = (o: Record<string, unknown>, ...keys: string[]): unknown => {
    for (const k of keys) {
      const v = o[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  const quality_gains: QualityGain[] = asList(
    parsed.quality_gains ?? parsed.qualityGains ?? parsed.gains
  ).map((item) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      return {
        title: String(pick(o, "title", "name", "t") ?? "Improvement"),
        detail: String(pick(o, "detail", "description", "message", "d") ?? ""),
      };
    }
    return { title: "Improvement", detail: String(item) };
  });
  const improvement_areas: ImprovementArea[] = asList(
    parsed.improvement_areas ?? parsed.improvementAreas ?? parsed.areas
  ).map((item) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      return {
        area: String(pick(o, "area", "category", "aspect", "a") ?? "general"),
        detail: String(pick(o, "detail", "feedback", "description", "message", "d") ?? ""),
        impact: String(pick(o, "impact", "priority", "severity") ?? "MEDIUM").toUpperCase(),
      };
    }
    return { area: "general", detail: String(item), impact: "MEDIUM" };
  });
  const techniques: string[] = asList(parsed.techniques).map((t) =>
    typeof t === "string" ? t : JSON.stringify(t)
  );
  const codeRaw =
    typeof parsed.optimized_code === "string"
      ? parsed.optimized_code
      : typeof parsed.fixed_code === "string"
        ? parsed.fixed_code
        : null;
  return {
    original_time: asCx(parsed.original_time ?? parsed.originalTime),
    original_space: asCx(parsed.original_space ?? parsed.originalSpace),
    optimized_time: asCx(parsed.optimized_time ?? parsed.optimizedTime),
    optimized_space: asCx(parsed.optimized_space ?? parsed.optimizedSpace),
    optimized_code: codeRaw,
    techniques,
    quality_gains,
    improvement_areas,
    optimized_truncated: parsed.optimized_truncated === true,
  };
}

/* NOTE: /ai/insights has a tiny output budget (~500 tokens on older deploys),
 * so the fallback is split in TWO small calls — analysis JSON (no code) plus
 * plain optimized code. One giant JSON with the full file always arrives
 * truncated, which is what produced the permanent "couldn't generate" error. */
const OPTIMIZE_ANALYSIS_PROMPT = (language: string, ctx: string) =>
  `You optimize ${language} code for time and space complexity. JSON ONLY, no fences, NO code: {"original_time":{"value":"e.g. O(n^2)","explanation":"why under 10 words"},"original_space":{"value":"e.g. O(n)","explanation":"why under 10 words"},"optimized_time":{"value":"e.g. O(n)","explanation":"what changed under 10 words"},"optimized_space":{"value":"e.g. O(1)","explanation":"what changed under 10 words"},"techniques":["technique + why, max 3"],"quality_gains":[{"title":"..","detail":"how quality improved, under 12 words"}],"improvement_areas":[{"area":"COMPLEXITY|STRUCTURE|READABILITY|PERFORMANCE|MEMORY|EDGE_CASES","detail":"what to improve next, under 12 words","impact":"HIGH|MEDIUM|LOW"}]} max 3 gains, max 3 areas, terse. ALWAYS close all brackets.\n\n${ctx}`;

const OPTIMIZE_CODE_PROMPT = (language: string, ctx: string) =>
  `Return ONLY the optimized ${language} version of the code below — no explanations, no markdown fences. Same behavior, better time/space complexity where possible (hash maps, memoization, two pointers, early exits). If already optimal, return it unchanged. Never truncate, never placeholders.\n\n${ctx}`;

export async function requestOptimization(
  code: string,
  language: string
): Promise<OptimizationResult> {
  // Primary: dedicated structured endpoint.
  try {
    const r = await fetch(`${BACKEND}/ai/optimize`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ code, language }),
    });
    if (r.ok) {
      const data = await r.json();
      if (data && (data.optimized_code || data.status === "success" || data.status === "partial")) {
        const norm = normalizeOptimization(data as Record<string, unknown>);
        if (norm.optimized_code && !isCodeComplete(norm.optimized_code)) {
          norm.optimized_truncated = true;
        }
        return norm;
      }
      throw new Error("Unexpected optimize response");
    }
    if (r.status === 404) throw new Error("OPTIMIZE_NOT_DEPLOYED");
    throw new Error(`optimize endpoint ${r.status}`);
  } catch (primaryErr) {
    // Fallback: generic insights endpoint (older backend deploys without /ai/optimize).
    if (primaryErr instanceof Error && /rate.?limit|at capacity/i.test(primaryErr.message)) throw primaryErr;
    if (primaryErr instanceof TypeError) {
      throw new Error("Could not reach the AI backend. Check your connection and try again.");
    }
    const ctx = `Language: ${language}\nCode:\n${code}`;
    // 1) Analysis JSON (small — fits the insights token budget).
    let analysis: Record<string, unknown> = {};
    try {
      const raw = await insightsCall(OPTIMIZE_ANALYSIS_PROMPT(language, ctx), 20, 3);
      analysis = extractJson(stripFences(raw.trim()));
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") {
        throw new Error("DevIQ's AI is at capacity right now (rate limit). Wait a minute or two and try again.");
      }
      /* fall through — code call may still succeed */
    }
    // 2) Optimized code as plain text (no JSON wrapper to waste budget).
    let optCode: string | null = null;
    let truncated = false;
    try {
      const rawCode = await insightsCall(OPTIMIZE_CODE_PROMPT(language, ctx), 5, 2);
      const stripped = stripFences(rawCode).slice(0, 6000);
      if (stripped && stripped !== "NO_CHANGE" && stripped.length > 10) {
        optCode = stripped;
        truncated = !isCodeComplete(stripped);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "RATE_LIMITED") {
        throw new Error("DevIQ's AI is at capacity right now (rate limit). Wait a minute or two and try again.");
      }
      /* fall through — analysis alone is still useful */
    }
    const merged: Record<string, unknown> = { ...analysis };
    if (optCode) merged.optimized_code = optCode;
    const norm = normalizeOptimization(merged);
    if (optCode) norm.optimized_truncated = truncated;
    const hasCx =
      norm.original_time.value !== "—" ||
      norm.optimized_time.value !== "—" ||
      norm.original_space.value !== "—" ||
      norm.optimized_space.value !== "—";
    if (!optCode && !hasCx && norm.quality_gains.length === 0 && norm.improvement_areas.length === 0 && norm.techniques.length === 0) {
      throw new Error("Couldn't generate an optimized version right now. Try again in a moment.");
    }
    return norm;
  }
}

/* ── Small presentational helpers ── */
function sevColor(sev: string, tk: PlaygroundTheme): { c: string; bg: string; b: string } {
  const s = (sev || "").toLowerCase();
  if (s === "critical") return { c: tk.rose, bg: tk.roseLight, b: tk.roseBorder };
  if (s === "high") return { c: tk.amber, bg: tk.amberLight, b: tk.amberBorder };
  if (s === "medium") return { c: tk.blue, bg: tk.blueLight, b: tk.blueBorder };
  return { c: tk.green, bg: tk.greenLight, b: tk.greenBorder };
}

function ScoreRing({ score, tk }: { score: number | null; tk: PlaygroundTheme }) {
  const v = score ?? 0;
  const R = 26;
  const circ = 2 * Math.PI * R;
  const color = score === null ? tk.text3 : v >= 80 ? tk.green : v >= 60 ? tk.blue : v >= 40 ? tk.amber : tk.rose;
  return (
    <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
      <svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={36} cy={36} r={R} fill="none" stroke={tk.track} strokeWidth={6} />
        <circle
          cx={36}
          cy={36}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - v / 100)}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {score === null ? "—" : v}
        </span>
      </div>
    </div>
  );
}

function SectionCard({
  tk,
  title,
  count,
  children,
  accent,
}: {
  tk: PlaygroundTheme;
  title: string;
  count?: number;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, overflow: "hidden", boxShadow: tk.shadow }}>
      <div style={{ padding: "11px 16px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        {accent && <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, flexShrink: 0 }} />}
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.text }}>{title}</span>
        {typeof count === "number" && (
          <span style={{ fontSize: 11, fontWeight: 600, color: tk.text3, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 20, padding: "1px 8px" }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ padding: "12px 16px" }}>{children}</div>
    </div>
  );
}

function UnverifiedNote({
  tk,
  text,
  onRetry,
  retrying,
}: {
  tk: PlaygroundTheme;
  text: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div style={{ background: tk.amberLight, border: `1px solid ${tk.amberBorder}`, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, color: tk.amber, lineHeight: 1.6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ flex: 1, minWidth: 200 }}>{text}</span>
      {onRetry && (
        <button onClick={onRetry} disabled={retrying} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${tk.amberBorder}`, background: "transparent", color: tk.amber, fontSize: 12, fontWeight: 700, cursor: retrying ? "wait" : "pointer", whiteSpace: "nowrap" }}>
          {retrying ? "Retrying…" : "↻ Retry failed checks"}
        </button>
      )}
    </div>
  );
}

/* ── Main component ── */
/** Snapshot lifted to the parent so the Review tab survives tab switches. */
export interface PersistedReviewState {
  code: string;
  langSel: string;
  result: ReviewResult | null;
  optimization: OptimizationResult | null;
}

export default function CodeReviewPage({ tk, isMobile, initial, onPersist }: {
  tk: PlaygroundTheme;
  isMobile: boolean;
  /** Restored when remounting (tab switches). In-memory only — cleared on refresh. */
  initial?: PersistedReviewState | null;
  onPersist?: (s: PersistedReviewState) => void;
}) {
  const [langSel, setLangSel] = useState(initial?.langSel ?? "auto");
  const [code, setCode] = useState(initial?.code ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ReviewResult | null>(initial?.result ?? null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState<string | null>(null);
  const [fixedCopied, setFixedCopied] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(initial?.optimization ?? null);
  const [optStatus, setOptStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [optError, setOptError] = useState<string | null>(null);
  const [optCopied, setOptCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollToResults = useCallback(() => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const language = langSel === "auto" ? detectLanguage(code) : langSel;
  const staticFindings = useMemo(() => staticReview(code, language), [code, language]);
  const lineCount = useMemo(() => (code ? code.split("\n").length : 1), [code]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Persist editor + results to the parent on unmount (tab switch) so
  // everything is restored when the tab remounts. Refs avoid stale closures.
  const snapRef = useRef<PersistedReviewState>({ code: "", langSel: "auto", result: null, optimization: null });
  snapRef.current = { code, langSel, result, optimization };
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  useEffect(() => {
    return () => {
      persistRef.current?.({ ...snapRef.current });
    };
  }, []);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const g = gutterRef.current;
    if (ta && g) g.scrollTop = ta.scrollTop;
  }, []);

  const review = useCallback(async () => {
    if (status === "loading") return;
    if (!code.trim()) {
      setError("Paste some code first, then hit Review.");
      return;
    }
    if (code.length > 30000) {
      setError("Code is too large for review (max ~30KB). Trim it and try again.");
      return;
    }
    setStatus("loading");
    setError(null);
    setResult(null);
    setOptimization(null);
    setOptStatus("idle");
    setOptError(null);
    setProgress(null);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - t0), 100);
    try {
      const res = await requestReview(code, language, (s) => setProgress(s));
      setResult(res);
      setStatus("success");
      // Jump straight to the review — no manual scrolling needed.
      setTimeout(scrollToResults, 150);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed. Try again.");
      setStatus("error");
    } finally {
      setProgress(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [code, language, status]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void review();
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
    [review]
  );

  const insertSample = useCallback(() => {
    setCode(language === "python" ? SAMPLE_PY : SAMPLE_JS);
    if (language === "python") setLangSel("python");
    else if (langSel === "auto" || langSel === "python") setLangSel("javascript");
    setResult(null);
    setError(null);
    setStatus("idle");
  }, [language, langSel]);

  const copyFixed = useCallback(async () => {
    if (!result?.fixed_code) return;
    try {
      await navigator.clipboard.writeText(result.fixed_code);
      setFixedCopied(true);
      setTimeout(() => setFixedCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [result]);

  const useFixed = useCallback(() => {
    if (!result?.fixed_code) return;
    setCode(result.fixed_code);
    setResult(null);
    setStatus("idle");
    textareaRef.current?.focus();
  }, [result]);

  const [regeneratingFix, setRegeneratingFix] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const retryFailed = useCallback(async () => {
    if (retrying || !result?.partial?.length) return;
    setRetrying(true);
    try {
      const keys = result.partial.filter((k): k is "bugs" | "complexity" | "security" | "quality" =>
        ["bugs", "complexity", "security", "quality"].includes(k)
      );
      if (keys.length === 0) return;
      const { result: sparse, verified } = await retryReviewSections(code, language, keys);
      setResult((prev) => {
        if (!prev) return prev;
        const next: typeof prev = { ...prev };
        if (sparse.bugs.length > 0) next.bugs = sparse.bugs;
        if (sparse.warnings.length > 0) next.warnings = sparse.warnings;
        if (sparse.summary) next.summary = sparse.summary;
        if (sparse.score !== null) next.score = sparse.score;
        if (sparse.time_complexity.value !== "—") next.time_complexity = sparse.time_complexity;
        if (sparse.space_complexity.value !== "—") next.space_complexity = sparse.space_complexity;
        if (sparse.security.length > 0) next.security = sparse.security;
        if (sparse.quality.length > 0) next.quality = sparse.quality;
        if (sparse.improvements.length > 0) next.improvements = sparse.improvements;
        next.partial = (prev.partial ?? []).filter((k) => !verified.includes(k));
        return next;
      });
    } catch (e) {
      if (e instanceof Error && /rate.?limit|at capacity/i.test(e.message)) {
        setError("DevIQ's AI is at capacity right now (rate limit). Wait a minute or two and retry.");
      }
      /* otherwise keep existing results; notices remain */
    } finally {
      setRetrying(false);
    }
  }, [code, language, result, retrying]);
  const regenerateFix = useCallback(async () => {
    if (regeneratingFix) return;
    setRegeneratingFix(true);
    try {
      const res = await requestFix(code, language);
      if (res.code) {
        setResult((prev) =>
          prev ? { ...prev, fixed_code: res.code, fixed_truncated: res.truncated } : prev
        );
      } else {
        setError("Couldn't generate a fix right now. Try again in a moment.");
      }
    } catch {
      setError("Couldn't generate a fix right now. Try again in a moment.");
    } finally {
      setRegeneratingFix(false);
    }
  }, [code, language, regeneratingFix]);

  const generateOptimization = useCallback(async () => {
    if (optStatus === "loading" || !code.trim()) return;
    setOptStatus("loading");
    setOptError(null);
    try {
      const res = await requestOptimization(code, language);
      setOptimization(res);
      setOptStatus("success");
    } catch (e) {
      setOptError(e instanceof Error ? e.message : "Optimization failed. Try again.");
      setOptStatus("error");
    }
  }, [code, language, optStatus]);

  const copyOptimized = useCallback(async () => {
    if (!optimization?.optimized_code) return;
    try {
      await navigator.clipboard.writeText(optimization.optimized_code);
      setOptCopied(true);
      setTimeout(() => setOptCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }, [optimization]);

  const useOptimized = useCallback(() => {
    if (!optimization?.optimized_code) return;
    setCode(optimization.optimized_code);
    textareaRef.current?.focus();
  }, [optimization]);

  return (
    <div style={{ paddingTop: 8 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: tk.text3, marginBottom: 10 }}>
          AI Code Review
        </div>
        <h1 style={{ fontSize: isMobile ? "clamp(28px,9vw,42px)" : "clamp(34px,5vw,50px)", fontWeight: 600, letterSpacing: "-0.04em", color: tk.text, lineHeight: 1.08, marginBottom: 12 }}>
          Paste code. Get a senior-level review.
        </h1>
        <p style={{ fontSize: 14, color: tk.text2, lineHeight: 1.7, maxWidth: 640 }}>
          DevIQ flags bugs, estimates time &amp; space
          complexity, generates an optimized rewrite with quality gains and areas to
          improve, catches security issues, grades code quality, and suggests concrete
          fixes — plus instant static checks as you type. Press{" "}
          <kbd style={{ fontFamily: "monospace", fontSize: 12, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 5, padding: "1px 6px" }}>
            Ctrl + Enter
          </kbd>{" "}
          to review.
        </p>
      </div>

      {/* INPUT CARD */}
      <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, overflow: "hidden", boxShadow: tk.shadow, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${tk.border}` }}>
          <label htmlFor="deviq-review-lang" style={{ fontSize: 12, color: tk.text3, fontWeight: 500 }}>Language</label>
          <select
            id="deviq-review-lang"
            value={langSel}
            onChange={(e) => setLangSel(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text, fontSize: 13, fontWeight: 600, cursor: "pointer", outline: "none", textTransform: "capitalize" }}
          >
            <option value="auto">Auto-detect{langSel === "auto" && code.trim() ? ` (${language})` : ""}</option>
            {LANG_OPTIONS.map((l) => (
              <option key={l} value={l}>{l === "cpp" ? "C++" : l === "csharp" ? "C#" : l[0].toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button onClick={insertSample} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            Try a sample
          </button>
          <button onClick={() => { setCode(""); setResult(null); setOptimization(null); setOptStatus("idle"); setOptError(null); setError(null); setStatus("idle"); }} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            Clear
          </button>
          <button
            onClick={() => void review()}
            disabled={status === "loading"}
            style={{ padding: "8px 22px", borderRadius: 8, border: "none", background: status === "loading" ? tk.track : tk.accent, color: tk.accentFg, fontSize: 13, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer", opacity: status === "loading" ? 0.7 : 1 }}
          >
            {status === "loading" ? `Reviewing… ${(elapsed / 1000).toFixed(0)}s` : "Review Code"}
          </button>
        </div>
        <div style={{ display: "flex", minHeight: 300 }}>
          <div
            ref={gutterRef}
            style={{ width: 52, flexShrink: 0, overflow: "hidden", background: tk.bgAlt, borderRight: `1px solid ${tk.border}`, padding: "14px 8px 14px 0", textAlign: "right", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.65, color: tk.text3, userSelect: "none" }}
          >
            {Array.from({ length: lineCount }, (_, i) => {
              const n = i + 1;
              return (
                <div key={n} style={{ padding: "0 4px" }}>
                  {n}
                </div>
              );
            })}
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
            aria-label="Code to review"
            placeholder="// Paste your code here, then press Ctrl + Enter"
            style={{ flex: 1, border: "none", outline: "none", resize: "vertical", background: "transparent", color: tk.text, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 13, lineHeight: 1.65, padding: "14px 16px", whiteSpace: "pre", overflow: "auto", minHeight: 300 }}
          />
        </div>
        <div style={{ padding: "8px 14px", borderTop: `1px solid ${tk.border}`, fontSize: 11, color: tk.text3, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
          <span>{lineCount} lines · {code.length.toLocaleString()} chars</span>
          <span>Max ~30KB per review</span>
        </div>
      </div>

      {/* INSTANT STATIC CHECKS */}
      {staticFindings.length > 0 && (
        <SectionCard tk={tk} title="Instant static checks" count={staticFindings.length} accent={tk.amber}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {staticFindings.map((f, i) => {
              const s = sevColor(f.severity, tk);
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "9px 12px" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                    {f.severity}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                      {f.title}
                      {f.line && <span style={{ fontWeight: 400, color: tk.text3 }}> · line {f.line}</span>}
                      <span style={{ fontWeight: 400, color: tk.text3 }}> · {f.category} · local</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 2 }}>{f.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: tk.text3, marginTop: 10 }}>
            These run instantly in your browser. The AI review below goes deeper (logic bugs, complexity, fixes).
          </div>
        </SectionCard>
      )}

      <div style={{ height: 12 }} />

      {/* STATUS / ERROR */}
      {status === "loading" && (
        <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, padding: 18, boxShadow: tk.shadow, color: tk.text3, fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>{progress || `AI is reviewing your ${language} code… (usually 30–90s)`}</div>
          <div style={{ height: 3, borderRadius: 3, background: tk.track, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", borderRadius: 3, background: tk.blue, animation: "deviq-slide 1s ease-in-out infinite alternate" }} />
          </div>
          <style>{`@keyframes deviq-slide{from{margin-left:0}to{margin-left:60%}}`}</style>
        </div>
      )}
      {error && status !== "loading" && (
        <div style={{ background: tk.roseLight, border: `1px solid ${tk.roseBorder}`, borderRadius: 8, padding: "12px 14px", color: tk.rose, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}

      {/* RESULTS */}
      {result && status === "success" && (
        <div ref={resultsRef} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: staticFindings.length > 0 || error ? 12 : 0, scrollMarginTop: 90 }}>
          {/* Summary + score */}
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, padding: 18, boxShadow: tk.shadow, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <ScoreRing score={result.score} tk={tk} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3, marginBottom: 6 }}>Summary</div>
              <div style={{ fontSize: 14, color: tk.text, lineHeight: 1.7 }}>{result.summary || "No summary provided."}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11.5, color: tk.text3 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: tk.rose }} />Bug — will fail on normal inputs</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: tk.amber }} />Warning — might fail on edge cases</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: tk.green }} />Suggestion — quality improvement</span>
              </div>
            </div>
          </div>

          {/* Complexity */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
            {[
              { label: "Time complexity", cx: result.time_complexity },
              { label: "Space complexity", cx: result.space_complexity },
            ].map((item) => (
              <div key={item.label} style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, padding: "14px 16px", boxShadow: tk.shadow }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: tk.text3, marginBottom: 6 }}>{item.label}</div>
                {item.cx.value === "—" && (result.partial ?? []).includes("complexity") ? (
                  <UnverifiedNote tk={tk} text="Complexity check didn't complete — retry just the failed checks." onRetry={retryFailed} retrying={retrying} />
                ) : (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 700, color: tk.purple, fontFamily: "ui-monospace, monospace", letterSpacing: "-0.02em" }}>{item.cx.value}</div>
                    {item.cx.explanation && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 6 }}>{item.cx.explanation}</div>}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Optimized Time & Space — improved-complexity rewrite + quality gains */}
          <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, overflow: "hidden", boxShadow: tk.shadow }}>
            <div style={{ padding: "11px 16px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: tk.purple, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.text }}>
                Optimized time &amp; space
              </span>
              {optimization && optStatus === "success" && (
                <span style={{ fontSize: 11, fontWeight: 600, color: tk.text3, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 20, padding: "1px 8px" }}>
                  {optimization.quality_gains.length + optimization.improvement_areas.length} insights
                </span>
              )}
              <div style={{ flex: 1 }} />
              {(!optimization || optStatus !== "success") && (
                <button
                  onClick={() => void generateOptimization()}
                  disabled={optStatus === "loading"}
                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: optStatus === "loading" ? tk.track : tk.purple, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: optStatus === "loading" ? "wait" : "pointer", opacity: optStatus === "loading" ? 0.7 : 1 }}
                >
                  {optStatus === "loading" ? "Optimizing…" : "Optimize time & space"}
                </button>
              )}
              {optimization && optStatus === "success" && (
                <>
                  <button onClick={copyOptimized} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    {optCopied ? "Copied ✓" : "Copy"}
                  </button>
                  <button onClick={useOptimized} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: tk.accent, color: tk.accentFg, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Load into editor
                  </button>
                  <button onClick={() => void generateOptimization()} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${tk.border}`, background: "transparent", color: tk.text3, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    ↻ Regenerate
                  </button>
                </>
              )}
            </div>
            <div style={{ padding: "12px 16px" }}>
              {optStatus === "loading" && (
                <div style={{ fontSize: 13, color: tk.text3, lineHeight: 1.6 }}>
                  Analyzing bottlenecks and rewriting for better time &amp; space complexity…
                  <div style={{ height: 3, borderRadius: 3, background: tk.track, overflow: "hidden", marginTop: 10 }}>
                    <div style={{ height: "100%", width: "40%", borderRadius: 3, background: tk.purple, animation: "deviq-slide 1s ease-in-out infinite alternate" }} />
                  </div>
                </div>
              )}
              {optStatus === "error" && optError && (
                <div style={{ background: tk.roseLight, border: `1px solid ${tk.roseBorder}`, borderRadius: 8, padding: "10px 12px", color: tk.rose, fontSize: 13, lineHeight: 1.6 }}>
                  {optError}{" "}
                  <button onClick={() => void generateOptimization()} style={{ marginLeft: 6, padding: "4px 12px", borderRadius: 6, border: `1px solid ${tk.roseBorder}`, background: "transparent", color: tk.rose, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Try again
                  </button>
                </div>
              )}
              {optStatus === "idle" && !optimization && (
                <div style={{ fontSize: 13, color: tk.text2, lineHeight: 1.7 }}>
                  Get an <strong style={{ color: tk.text }}>optimized rewrite</strong> of your code with better
                  time &amp; space complexity — plus <strong style={{ color: tk.text }}>quality gains</strong> and{" "}
                  <strong style={{ color: tk.text }}>areas to improve</strong>. Your current complexity is shown above;
                  press the button to see the before → after comparison and the improved code.
                </div>
              )}
              {optimization && optStatus === "success" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Before → After complexity */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Time", before: optimization.original_time, after: optimization.optimized_time },
                      { label: "Space", before: optimization.original_space, after: optimization.optimized_space },
                    ].map((row) => (
                      <div key={row.label} style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: tk.text3, marginBottom: 8 }}>{row.label} complexity</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: tk.text2, background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 6, padding: "3px 10px" }}>
                            {row.before.value}
                          </span>
                          <span style={{ color: tk.purple, fontWeight: 700 }}>→</span>
                          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace", color: tk.purple, background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 6, padding: "3px 10px" }}>
                            {row.after.value}
                          </span>
                          {row.before.value !== "—" && row.after.value !== "—" && row.before.value === row.after.value && (
                            <span style={{ fontSize: 11, color: tk.text3 }}>(already optimal)</span>
                          )}
                        </div>
                        {(row.before.explanation || row.after.explanation) && (
                          <div style={{ fontSize: 12, color: tk.text2, lineHeight: 1.6, marginTop: 6 }}>
                            {row.after.explanation || row.before.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Techniques */}
                  {optimization.techniques.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {optimization.techniques.map((t, i) => (
                        <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: tk.purple, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 20, padding: "3px 11px" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Optimized code */}
                  {optimization.optimized_code ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: tk.text3, marginBottom: 6 }}>Improved code</div>
                      {optimization.optimized_truncated && (
                        <div style={{ background: tk.amberLight, border: `1px solid ${tk.amberBorder}`, borderRadius: 6, padding: "8px 10px", fontSize: 12, color: tk.amber, marginBottom: 8 }}>
                          This looks cut off at the end — press Regenerate for the complete version.
                        </div>
                      )}
                      <pre style={{ margin: 0, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.65, color: tk.text, background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", maxHeight: 360, overflowY: "auto" }}>
                        {optimization.optimized_code}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: tk.text2, lineHeight: 1.6 }}>Your code is already optimal — no rewrite needed.</div>
                  )}
                  {/* Quality gains */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: tk.green, marginBottom: 6 }}>
                      Quality improvements ({optimization.quality_gains.length})
                    </div>
                    {optimization.quality_gains.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: tk.text3 }}>No extra quality notes.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {optimization.quality_gains.map((g, i) => (
                          <div key={i} style={{ background: tk.greenLight, border: `1px solid ${tk.greenBorder}`, borderRadius: 8, padding: "8px 12px" }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: tk.green }}>✓ {g.title}</div>
                            {g.detail && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 2 }}>{g.detail}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Areas to improve */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: tk.amber, marginBottom: 6 }}>
                      Areas to improve ({optimization.improvement_areas.length})
                    </div>
                    {optimization.improvement_areas.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: tk.text3 }}>Nothing left — clean code.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {optimization.improvement_areas.map((a, i) => {
                          const s = sevColor(a.impact === "HIGH" ? "high" : a.impact === "LOW" ? "low" : "medium", tk);
                          return (
                            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "8px 12px" }}>
                              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                                {a.impact || "MEDIUM"}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: tk.text, textTransform: "uppercase", letterSpacing: "0.03em" }}>{a.area || "general"}</div>
                                <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 2 }}>{a.detail}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bugs — definite errors only */}
          <SectionCard tk={tk} title="Bugs" count={result.bugs.length} accent={tk.rose}>
            {result.bugs.length === 0 ? (
              (result.partial ?? []).includes("bugs") ? (
                <UnverifiedNote tk={tk} text="The bug check didn't complete — retry just the failed checks." onRetry={retryFailed} retrying={retrying} />
              ) : (
                <div style={{ fontSize: 13, color: tk.text3 }}>No definite bugs found. Possible risks are listed under Warnings below.</div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.bugs.map((b, i) => {
                  const s = sevColor(b.severity, tk);
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "9px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                        {b.severity || "info"}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                          {b.title}
                          {typeof b.line === "number" && <span style={{ fontWeight: 400, color: tk.text3 }}> · line {b.line}</span>}
                        </div>
                        {(b.category || typeof b.confidence === "number") && (
                          <div style={{ fontSize: 11, color: tk.text3, marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {b.category && <span style={{ fontFamily: "ui-monospace, monospace" }}>{b.category}</span>}
                            {typeof b.confidence === "number" && <span>confidence {b.confidence}%</span>}
                          </div>
                        )}
                        {b.detail && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 4 }}>{b.detail}</div>}
                        {b.trigger && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 4 }}><strong style={{ color: tk.text }}>Trigger:</strong> {b.trigger}</div>}
                        {(b.expected || b.actual) && (
                          <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                            {b.expected && <div style={{ color: tk.text2 }}><strong style={{ color: tk.green }}>Expected:</strong> {b.expected}</div>}
                            {b.actual && <div style={{ color: tk.text2 }}><strong style={{ color: tk.rose }}>Actual:</strong> {b.actual}</div>}
                          </div>
                        )}
                        {b.fix && (
                          <pre style={{ margin: "6px 0 0", padding: "8px 10px", fontSize: 12, lineHeight: 1.6, color: tk.green, background: tk.greenLight, border: `1px solid ${tk.greenBorder}`, borderRadius: 6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" }}>
                            <strong>Fix:</strong> {b.fix}
                          </pre>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Warnings — possible problems, not definite bugs */}
          <SectionCard tk={tk} title="Warnings" count={result.warnings.length} accent={tk.amber}>
            {result.warnings.length === 0 ? (
              (result.partial ?? []).includes("bugs") ? (
                <UnverifiedNote tk={tk} text="The warnings check didn't complete — retry just the failed checks." onRetry={retryFailed} retrying={retrying} />
              ) : (
                <div style={{ fontSize: 13, color: tk.text3 }}>No warnings — no risky edge cases spotted.</div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, color: tk.text3, lineHeight: 1.6 }}>
                  These <em>might</em> fail on unusual inputs, exception paths, or at scale — unlike bugs above, they don&apos;t fail on normal inputs.
                </div>
                {result.warnings.map((w, i) => {
                  const s = sevColor(w.severity, tk);
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "9px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                        {w.severity || "info"}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>
                          {w.title}
                          {typeof w.line === "number" && <span style={{ fontWeight: 400, color: tk.text3 }}> · line {w.line}</span>}
                        </div>
                        {w.detail && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 2 }}>{w.detail}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Security */}
          <SectionCard tk={tk} title="Security issues" count={result.security.length} accent={tk.amber}>
            {result.security.length === 0 ? (
              (result.partial ?? []).includes("security") ? (
                <UnverifiedNote tk={tk} text="The security check didn't complete — retry just the failed checks." onRetry={retryFailed} retrying={retrying} />
              ) : (
                <div style={{ fontSize: 13, color: tk.text3 }}>No security issues detected.</div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.security.map((s2, i) => {
                  const s = sevColor(s2.severity, tk);
                  return (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "9px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: s.c, background: s.bg, border: `1px solid ${s.b}`, borderRadius: 20, padding: "2px 8px", flexShrink: 0, marginTop: 1 }}>
                        {s2.severity || "info"}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: tk.text }}>{s2.title}</div>
                        {s2.detail && <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 2 }}>{s2.detail}</div>}
                        {s2.fix && <div style={{ fontSize: 12.5, color: tk.green, lineHeight: 1.6, marginTop: 4 }}><strong>Fix:</strong> {s2.fix}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* Quality */}
          <SectionCard tk={tk} title="Code quality" count={result.quality.length} accent={tk.blue}>
            {result.quality.length === 0 ? (
              (result.partial ?? []).includes("quality") ? (
                <UnverifiedNote tk={tk} text="The quality check didn't complete — retry just the failed checks." onRetry={retryFailed} retrying={retrying} />
              ) : (
                <div style={{ fontSize: 13, color: tk.text3 }}>No quality notes — solid code.</div>
              )
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.quality.map((q, i) => (
                  <div key={i} style={{ background: tk.bgAlt, border: `1px solid ${tk.border}`, borderRadius: 8, padding: "9px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: tk.blue }}>{q.area || "general"}</div>
                    <div style={{ fontSize: 12.5, color: tk.text2, lineHeight: 1.6, marginTop: 3 }}>{q.feedback}</div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Improvements */}
          <SectionCard tk={tk} title="Suggestions" count={result.improvements.length} accent={tk.green}>
            {result.improvements.length === 0 ? (
              <div style={{ fontSize: 13, color: tk.text3 }}>Nothing to add — ship it.</div>
            ) : (
              <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.improvements.map((imp, i) => (
                  <li key={i} style={{ fontSize: 13, color: tk.text2, lineHeight: 1.65 }}>{imp}</li>
                ))}
              </ol>
            )}
          </SectionCard>

          {/* Fixed code */}
          {result.fixed_code ? (
            <div style={{ background: tk.surface, border: `1px solid ${tk.border}`, borderRadius: 10, overflow: "hidden", boxShadow: tk.shadow }}>
              <div style={{ padding: "11px 16px", borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: tk.text }}>Fixed code</span>
                {result.repair_strategy && (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", color: tk.green, background: tk.greenLight, border: `1px solid ${tk.greenBorder}`, borderRadius: 20, padding: "2px 9px" }}>
                    {result.repair_strategy.replace(/_/g, " ")}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                {result.fixed_truncated && (
                  <button onClick={regenerateFix} disabled={regeneratingFix} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${tk.amberBorder}`, background: tk.amberLight, color: tk.amber, fontSize: 12, fontWeight: 600, cursor: regeneratingFix ? "wait" : "pointer" }}>
                    {regeneratingFix ? "Regenerating…" : "↻ Regenerate full program"}
                  </button>
                )}
                <button onClick={copyFixed} style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text2, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  {fixedCopied ? "Copied ✓" : "Copy"}
                </button>
                <button onClick={useFixed} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: tk.accent, color: tk.accentFg, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Load into editor
                </button>
              </div>
              {result.fixed_truncated && (
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${tk.border}`, background: tk.amberLight, fontSize: 12.5, color: tk.amber, lineHeight: 1.6 }}>
                  This fix looks cut off at the end — press Regenerate for the complete program.
                </div>
              )}
              <pre style={{ margin: 0, padding: "14px 16px", fontSize: 12.5, lineHeight: 1.65, color: tk.text, background: tk.bgAlt, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", maxHeight: 420, overflowY: "auto" }}>
                {result.fixed_code}
              </pre>
            </div>
          ) : (
            <button onClick={regenerateFix} disabled={regeneratingFix} style={{ padding: "10px 16px", borderRadius: 8, border: `1px dashed ${tk.borderStrong}`, background: "transparent", color: tk.text2, fontSize: 12.5, fontWeight: 500, cursor: regeneratingFix ? "wait" : "pointer", width: "100%" }}>
              {regeneratingFix ? "Generating fix…" : "+ Generate fixed code"}
            </button>
          )}
        </div>
      )}
      {/* Floating jump-to-review button — visible once a review is ready */}
      {result && status === "success" && (
        <button
          onClick={scrollToResults}
          aria-label="Go to review"
          style={{
            position: "fixed",
            right: isMobile ? 14 : 24,
            bottom: isMobile ? 16 : 24,
            zIndex: 150,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "11px 18px",
            borderRadius: 999,
            border: "none",
            background: tk.accent,
            color: tk.accentFg,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: tk.shadowLg,
          }}
        >
          Go to review
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>
        </button>
      )}
    </div>
  );
}
