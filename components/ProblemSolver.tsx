"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// Monaco (the VS Code editor) is heavy, so it loads only with this view,
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
      Loading editor…
    </div>
  ),
});

export interface SolverProblem {
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topicTags?: string[];
  url?: string;
}

interface Tk {
  bg: string; bgAlt: string; surface: string; border: string;
  text: string; text2: string; text3: string; accent: string; accentFg: string;
  blue: string; blueLight: string;
  green: string; greenLight: string; greenBorder: string;
  amber: string; amberLight: string; amberBorder: string;
  rose: string; roseLight: string; roseBorder: string;
  purple: string; purpleLight: string; purpleBorder: string;
}

interface CaseResult {
  input: string;
  expected: string;
  actual: string;
  pass: boolean;
  error: string;
}

const LANGUAGES = ["python", "javascript", "typescript", "java", "cpp", "c", "go"] as const;
type Lang = (typeof LANGUAGES)[number];

// LeetCode-style runs (Solution + official examples) are supported for
// these languages. Others keep the classic stdin playground.
const HARNESS_LANGS: Lang[] = ["python", "javascript", "typescript"];

interface QuestionData {
  slug: string;
  title: string;
  difficulty: string;
  method: { name: string; params: { name: string; type: string }[] };
  snippets: Record<string, string>;
  examples: { input: string; expected: string }[];
  content: string;
}

// LeetCode statement HTML is rendered, so strip anything executable first.
function sanitizeLeetCodeHtml(html: string): string {
  let out = (html || "")
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*"javascript:[^"]*"/gi, '$1="#"');
  return out;
}

// Plain-text version of the statement for AI prompts.
function stripHtmlToText(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

const STARTER: Record<Lang, string> = {
  python: `import sys

def solve():
    data = sys.stdin.read().strip().split()
    if not data:
        return
    # TODO: implement your solution. Example: echo the first token
    print(data[0])

if __name__ == "__main__":
    solve()
`,
  javascript: `const fs = require('fs');

const data = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);
// TODO: implement your solution. Example: echo the first token
if (data.length) console.log(data[0]);
`,
  typescript: `import * as fs from 'fs';

const data: string[] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).filter(Boolean);
// TODO: implement your solution. Example: echo the first token
if (data.length) console.log(data[0]);
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // TODO: implement your solution. Example: echo the first token
        if (sc.hasNext()) {
            System.out.println(sc.next());
        }
        sc.close();
    }
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // TODO: implement your solution. Example: echo the first token
    string x;
    if (cin >> x) cout << x;
    return 0;
}
`,
  c: `#include <stdio.h>
#include <string.h>

int main(void) {
    // TODO: implement your solution. Example: echo the first token
    char buf[100000];
    if (scanf("%99999s", buf) == 1) printf("%s", buf);
    return 0;
}
`,
  go: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    in := bufio.NewReader(os.Stdin)
    // TODO: implement your solution. Example: echo the first token
    var x string
    if _, err := fmt.Fscan(in, &x); err == nil {
        fmt.Print(x)
    }
}
`,
};

function extractCodeBlocks(text: string): string[] {
  const out: string[] = [];
  const re = /```(?:\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const code = m[1].trim();
    if (code) out.push(code);
  }
  if (out.length === 0) {
    // Truncated response (token cap): salvage everything after the opening fence.
    const open = text.match(/```(?:\w+)?\n([\s\S]*)$/);
    if (open && open[1].trim().length > 30) out.push(open[1].trim());
  }
  return out;
}

// LeetCode's editor needs no imports and no driver code — pasting them
// causes errors. Strip them so block 1 is paste-clean.
function stripImports(code: string, language: string): string {
  const patterns: RegExp[] = [/^\s*import\s+.+$/, /^\s*from\s+[\w.]+\s+import\s+.+$/];
  if (language === "java") patterns.push(/^\s*import\s+[\w.*]+\s*;\s*$/);
  if (language === "cpp" || language === "c") patterns.push(/^\s*#\s*include\s*[<"].*$/);
  return code
    .split("\n")
    .filter((line) => !patterns.some((p) => p.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function authedHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const tok = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (tok) h["Authorization"] = `Bearer ${tok}`;
  } catch {
    /* storage unavailable — backend will 401 */
  }
  return h;
}

function looksLikeLeetCodeSolution(code: string): boolean {
  return /class\s+Solution|function\s+\w+|var\s+\w+\s*=\s*function|func\s+\w+\s*\(/i.test(code);
}

function looksLikeRawCode(text: string): boolean {
  const t = (text || "").trim();
  if (t.length < 30) return false;
  return (
    looksLikeLeetCodeSolution(t) ||
    /^(def |function |public |#include|import |from )[\s\S]{20,}/m.test(t)
  );
}

function extractVerdict(text: string): string | null {
  const head = (text || "").slice(0, 1200);
  const m = head.match(/correct and optimal|correct but can be optimized|partially correct|incorrect|compilation error|insufficient information/i);
  return m ? m[0].toLowerCase() : null;
}

function verdictColor(verdict: string | null, tk: Tk): string {
  if (!verdict) return tk.text3;
  if (verdict.includes("correct and optimal")) return tk.green;
  if (verdict.includes("correct but")) return tk.blue;
  if (verdict.includes("partially")) return tk.amber;
  if (verdict.includes("incorrect") || verdict.includes("compilation")) return tk.rose;
  return tk.text3;
}

// Minimal markdown rendering for AI reviews (headers, bold, code, lists).
function renderReviewMarkdown(text: string, tk: Tk): ReactNode[] {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  const nodes: ReactNode[] = [];
  let key = 0;
  const lines = (text || "").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      nodes.push(
        <pre key={key++} style={{ background: tk.bg, border: `1px solid ${tk.border}`, borderRadius: 8, padding: 12, fontSize: 12, overflowX: "auto", color: tk.text, margin: "8px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {esc(buf.join("\n"))}
        </pre>
      );
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      nodes.push(
        <div key={key++} style={{ fontSize: level <= 2 ? 14 : 13, fontWeight: 700, color: tk.text, margin: "14px 0 6px" }}
          dangerouslySetInnerHTML={{ __html: inline(h[2]) }} />
      );
      i++;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      nodes.push(<hr key={key++} style={{ border: "none", borderTop: `1px solid ${tk.border}`, margin: "12px 0" }} />);
      i++;
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      nodes.push(
        <div key={key++} style={{ display: "flex", gap: 8, margin: "4px 0", fontSize: 13, color: tk.text2, lineHeight: 1.6 }}>
          <span style={{ color: tk.text3 }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: inline(bullet[1]) }} />
        </div>
      );
      i++;
      continue;
    }
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numbered) {
      nodes.push(
        <div key={key++} style={{ margin: "4px 0 4px 4px", fontSize: 13, color: tk.text2, lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: inline(line.trim()) }} />
      );
      i++;
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    nodes.push(
      <div key={key++} style={{ margin: "6px 0", fontSize: 13, color: tk.text2, lineHeight: 1.65 }}
        dangerouslySetInnerHTML={{ __html: inline(line) }} />
    );
    i++;
  }
  return nodes;
}

function extractReviewComplexity(text: string): { time: string | null; space: string | null } {
  const clean = (v: string) => {
    let s = v
      .replace(/[*_`]/g, "")
      .replace(/\\cdot/g, "·")
      .replace(/\\times/g, "×")
      .replace(/\\log/g, "log")
      .replace(/\\/g, "")
      .trim()
      .slice(0, 30);
    // Unwrap LaTeX inline-math parens: "\(O(n)\)" -> "O(n)".
    if (s.startsWith("(") && s.endsWith(")")) {
      const inner = s.slice(1, -1);
      const bal = (x: string) =>
        (x.match(/\(/g) || []).length === (x.match(/\)/g) || []).length;
      if (bal(s) && bal(inner)) s = inner;
    }
    return s || null;
  };
  const t = text.match(/^[ \t]*[-*]?\s*Time\s*:[ \t]*([^\n]+)/im);
  const s = text.match(/^[ \t]*[-*]?\s*Space\s*:[ \t]*([^\n]+)/im);
  return { time: t ? clean(t[1]) : null, space: s ? clean(s[1]) : null };
}

function extractComplexity(text: string): { time: string | null; space: string | null } {  const clean = (v: string) => v.replace(/[*_`]/g, "").trim().slice(0, 40) || null;
  const t = text.match(/time\s*(complexity)?\s*:\s*([^\n]+)/i);
  const s = text.match(/(?:space|memory)\s*(complexity)?\s*:\s*([^\n]+)/i);
  return { time: t ? clean(t[2]) : null, space: s ? clean(s[2]) : null };
}

export default function ProblemSolver({
  problem,
  backend,
  tk,
  dark,
  isMobile,
  solved,
  autoShowSolution,
  onBack,
  onSolved,
}: {
  problem: SolverProblem;
  backend: string;
  tk: Tk;
  dark: boolean;
  isMobile: boolean;
  solved: boolean;
  autoShowSolution?: boolean;
  onBack: () => void;
  onSolved: () => void;
}) {
  const leetcodeUrl = problem.url || `https://leetcode.com/problems/${problem.slug}/`;
  const codeKey = `deviq_solver_code_${problem.slug}`;

  const [language, setLanguage] = useState<Lang>("python");
  const [code, setCode] = useState<string>(STARTER.python);
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string; stderr: string; compile: string; exit: number | null; ms?: number;
  } | null>(null);
  const [runError, setRunError] = useState("");

  // Official-example run state (LeetCode mode).
  const [testing, setTesting] = useState(false);
  const [lcResults, setLcResults] = useState<CaseResult[] | null>(null);
  const [testError, setTestError] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [showStatement, setShowStatement] = useState(true);
  const [aiSolution, setAiSolution] = useState<string | null>(null);
  const [aiRunnable, setAiRunnable] = useState<string | null>(null);
  const [aiComplexity, setAiComplexity] = useState<{ time: string | null; space: string | null } | null>(null);
  const [aiError, setAiError] = useState("");
  const autoSolutionFired = useRef(false);

  // DSA mentor review of the user's own code.
  const [reviewText, setReviewText] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMode, setReviewMode] = useState<"learning" | "full">("learning");
  const [reviewError, setReviewError] = useState("");
  const [reviewedFor, setReviewedFor] = useState("");

  // Optimize the editor code with AI and load it back.
  const [optLoading, setOptLoading] = useState(false);
  const [optMsg, setOptMsg] = useState<string | null>(null);

  // Official LeetCode question data (snippets, method, examples).
  const [qdata, setQdata] = useState<QuestionData | null>(null);
  const [qloading, setQLoading] = useState(false);

  const leetcodeMode = !!qdata && (HARNESS_LANGS as string[]).includes(language);

  // Load persisted code for this problem.
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem(`${codeKey}_${language}`);
      setCode(savedCode ?? STARTER[language]);
    } catch {
      setCode(STARTER[language]);
    }
    setLcResults(null);
    setTestError("");
    setOutput(null);
    setRunError("");
    setAiSolution(null);
    setAiRunnable(null);
    setAiComplexity(null);
    setReviewText(null);
    setReviewError("");
    setReviewedFor("");
    setOptMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.slug, language]);

  // Persist code.
  useEffect(() => {
    try {
      localStorage.setItem(`${codeKey}_${language}`, code);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Fetch official LeetCode question data (snippet, method, examples).
  useEffect(() => {
    let cancelled = false;
    setQdata(null);
    setQLoading(true);
    fetch(`${backend}/leetcode/question/${encodeURIComponent(problem.slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setQdata(data as QuestionData);
      })
      .catch(() => {
        /* classic stdin mode fallback */
      })
      .finally(() => {
        if (!cancelled) setQLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.slug]);

  // Prefer the official LeetCode starter snippet for untouched editors.
  useEffect(() => {
    if (!qdata) return;
    const snip = qdata.snippets[language];
    if (!snip) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(`${codeKey}_${language}`);
    } catch {
      /* ignore */
    }
    if (saved != null && saved !== STARTER[language]) return;
    setCode((cur) => (cur === STARTER[language] || !cur.trim() ? snip : cur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qdata, language]);

  const execute = useCallback(
    async (stdinText: string) => {
      const body = JSON.stringify({ language, code, stdin: stdinText, timeout: 10 });
      const attempts = [backend, "/api/proxy"];
      let lastErr: unknown = null;
      for (const base of attempts) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 25000);
          let r: Response;
          try {
            r = await fetch(base === "/api/proxy" ? "/api/proxy/execute" : `${base}/execute`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body,
              signal: ctrl.signal,
              ...(base.startsWith("http") ? { mode: "cors" as RequestMode } : {}),
            });
          } finally {
            clearTimeout(t);
          }
          const data = await r.json().catch(() => ({} as Record<string, unknown>));
          if (!r.ok) {
            const msg =
              (typeof data.message === "string" && data.message) ||
              (typeof data.detail === "string" && data.detail) ||
              (typeof data.error === "string" && data.error) ||
              `Execution failed (${r.status})`;
            throw new Error(msg);
          }
          return data as {
            stdout?: string; stderr?: string; compile_output?: string;
            exit_code?: number | null; execution_time?: number; success?: boolean;
          };
        } catch (e) {
          lastErr = e;
          // Only retry via proxy on network-level failures, not on
          // backend-returned errors (same error would come back).
          if (e instanceof Error && e.message.startsWith("Execution failed")) throw e;
          if (base === "/api/proxy") throw e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("Execution failed");
    },
    [backend, language, code]
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setRunError("");
    setOutput(null);
    try {
      const data = await execute(stdin);
      setOutput({
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
        compile: data.compile_output ?? "",
        exit: data.exit_code ?? null,
        ms: data.execution_time != null ? Math.round(data.execution_time * 1000) : undefined,
      });
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }, [execute, stdin]);

  // LeetCode-style run: Solution against the official examples.
  const handleRunLeetCode = useCallback(async () => {
    setTesting(true);
    setTestError("");
    setLcResults(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      let r: Response;
      try {
        r = await fetch(`${backend}/leetcode/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: problem.slug, language, code }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(t);
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `Run failed (${r.status})`);
      setLcResults(
        (data.results || []).map(
          (res: { input?: string; expected?: string; actual?: string; pass?: boolean; error?: string }) => ({
            input: res.input ?? "",
            expected: res.expected ?? "",
            actual: res.actual ?? "",
            pass: !!res.pass,
            error: res.error ?? "",
          })
        )
      );
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setTesting(false);
    }
  }, [backend, problem.slug, language, code]);

  const handleSolveWithAI = useCallback(async (loadIntoEditor = false) => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const topicBit =
        `${problem.topicTags?.length ? ` (topics: ${problem.topicTags.join(", ")})` : ""}`;
      const statementText = qdata?.content ? stripHtmlToText(qdata.content) : "";
      const statementBit = statementText
        ? ` Read this complete problem statement carefully and base your solution on it:\n${statementText}`
        : "";
      const methodBit = qdata?.method?.name
        ? ` The method must be named \`${qdata.method.name}\`${
            qdata.method.params.length
              ? ` taking parameters (${qdata.method.params.map((p) => `${p.name}: ${p.type}`).join(", ")})`
              : ""
          }.`
        : "";
      const noOutlineBit =
        ` Do not respond with an outline, explanation, or partial code — only complete working code. ` +
        `An explanation without complete code is a wrong answer.`;
      const verifyBit =
        `Solve the EXACT task stated — match what the problem asks for (a count, a construction, a boolean, etc.), ` +
        `not a similar-sounding problem. Before finalizing, mentally run your logic against the problem's examples; ` +
        `if it fails any of them, fix the logic first. `;
      const promptFull =
        `Please give the optimal ${language} solution to the LeetCode ${problem.difficulty} problem ` +
        `"${problem.title}"${topicBit} — the approach with the best achievable time complexity, kept space-efficient. ` +
        statementBit +
        verifyBit +
        methodBit +
        noOutlineBit +
        `Please respond with two fenced code blocks followed by two short lines. ` +
        `The first block is the paste-into-LeetCode solution: the Solution class (Python/Java/C++/C#/Go) or the ` +
        `equivalent function form (JavaScript/TypeScript/C), using the official LeetCode method name and signature ` +
        `for this problem, with no import statements, no stdin reading, no driver and no main function. ` +
        `The second block is a minimal local runner: any imports the solution needs, plus a driver that reads the ` +
        `problem input from stdin, calls the solution, and prints the result to stdout. ` +
        `After the blocks, please add exactly these two lines with the solution's complexities:\nTime: <time complexity>\nSpace: <space complexity>`;
      const promptSimple =
        `Write your best attempt at the optimal ${language} solution for the LeetCode problem ` +
        `"${problem.title}" as a LeetCode Solution class with the official method signature, inside one fenced ` +
        `code block. Solve the EXACT task asked and mentally check it against the examples first. ` +
        (statementText ? `Problem statement: ${statementText} ` : "") +
        `Then add two lines stating its time and space complexity, like "Time: O(n)" and "Space: O(1)".`;
      const promptCodeOnly =
        `Output ONLY complete working ${language} code${methodBit} for the LeetCode problem ` +
        `"${problem.title}": a LeetCode Solution class with the official method signature in one fenced code ` +
        `block, followed by Time: and Space: lines. No explanations, no outlines, no partial code.`;
      const fetchRaw = async (promptText: string): Promise<string> => {
        const r = await fetch(`${backend}/ai/insights`, {
          method: "POST",
          headers: authedHeaders(),
          body: JSON.stringify({ prompt: promptText, max_tokens: 4000, temperature: 0.2 }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.detail || `AI request failed (${r.status})`);
        return data.result || "";
      };
      let raw = await fetchRaw(promptFull);
      let blocks = extractCodeBlocks(raw);
      const fallbacks = [promptSimple, promptCodeOnly];
      for (let i = 0; i < fallbacks.length && blocks.length === 0; i++) {
        // Model slip, refusal, or outline instead of code — retry with a
        // simpler, stricter prompt.
        await new Promise((res) => setTimeout(res, 3000));
        raw = await fetchRaw(fallbacks[i]);
        blocks = extractCodeBlocks(raw);
      }
      if (blocks.length === 0 && looksLikeRawCode(raw)) {
        // Model returned code without fences — use it as the solution.
        blocks = [raw.trim()];
      }
      if (blocks.length === 0) {
        console.error("AI solution response had no code:", (raw || "").slice(0, 500));
        const preview = (raw || "").trim().slice(0, 160);
        throw new Error(
          preview
            ? `The AI declined this one ("${preview}"). Try again or switch language.`
            : "The AI didn't return a code block. Try again."
        );
      }
      // Block 1: paste-clean LeetCode solution (no imports, no driver).
      const solution = stripImports(blocks[0], language);
      if (!looksLikeLeetCodeSolution(solution)) {
        throw new Error("The AI didn't return a LeetCode-style solution. Try again.");
      }
      setAiSolution(solution);
      // Block 2 (when provided): runner for the playground.
      const runnable = blocks.length > 1 ? `${blocks[0]}\n\n${blocks[1]}` : blocks[0];
      setAiRunnable(runnable);
      setAiComplexity(extractComplexity(raw));
      if (loadIntoEditor) setCode(leetcodeMode ? solution : runnable);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI solution failed");
    } finally {
      setAiLoading(false);
    }
  }, [backend, language, problem, leetcodeMode, aiLoading, qdata]);

  const handleSolutionClick = useCallback(async () => {
    if (aiLoading) return;
    if (aiSolution) {
      // Solution already fetched — load it straight into the editor.
      setCode(leetcodeMode ? aiSolution : aiRunnable ?? aiSolution);
      return;
    }
    await handleSolveWithAI(true);
  }, [aiLoading, aiSolution, aiRunnable, leetcodeMode, handleSolveWithAI]);

  // "Solution" list button: load the optimal solution straight into the editor.
  useEffect(() => {
    if (autoShowSolution && !autoSolutionFired.current) {
      autoSolutionFired.current = true;
      handleSolveWithAI(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoShowSolution]);

  const fetchReview = useCallback(async (mode: "learning" | "full") => {
    setReviewLoading(true);
    setReviewError("");
    try {
      const r = await fetch(`${backend}/ai/review-solution`, {
        method: "POST",
        headers: authedHeaders(),
        body: JSON.stringify({ slug: problem.slug, language, code, mode }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `Review failed (${r.status})`);
      const text = (data.result || "").trim();
      if (!text) throw new Error("The AI returned an empty review. Try again.");
      setReviewText(text);
      setReviewedFor(`${code}|${mode}`);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewLoading(false);
    }
  }, [backend, problem.slug, language, code]);

  const switchReviewMode = useCallback((mode: "learning" | "full") => {
    setReviewMode(mode);
    fetchReview(mode);
  }, [fetchReview]);

  const handleOptimize = useCallback(async () => {
    if (optLoading) return;
    setOptLoading(true);
    setOptMsg(null);
    try {
      const r = await fetch(`${backend}/ai/optimize`, {
        method: "POST",
        headers: authedHeaders(),
        body: JSON.stringify({ code, language }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || `Optimize failed (${r.status})`);
      const optimized = typeof data.optimized_code === "string" ? data.optimized_code.trim() : "";
      if (!optimized) {
        setOptMsg("Your code is already optimal — no rewrite needed.");
        return;
      }
      setCode(optimized);
      const t = data.optimized_time?.value;
      const s = data.optimized_space?.value;
      setOptMsg(
        `Optimized version loaded into the editor${t || s ? ` (${[t && `time ${t}`, s && `space ${s}`].filter(Boolean).join(", ")})` : ""}.`
      );
    } catch (e) {
      setOptMsg(e instanceof Error ? e.message : "Optimize failed");
    } finally {
      setOptLoading(false);
    }
  }, [backend, language, code, optLoading]);

  const busy = running || testing;
  const runDisabled = busy || (!!qdata && !leetcodeMode);
  const diffColor = problem.difficulty === "Hard" ? tk.rose : problem.difficulty === "Medium" ? tk.amber : tk.green;
  const diffBg = problem.difficulty === "Hard" ? tk.roseLight : problem.difficulty === "Medium" ? tk.amberLight : tk.greenLight;
  const lcPassed = lcResults ? lcResults.filter((r) => r.pass).length : 0;

  const btn = (primary: boolean): React.CSSProperties => ({
    padding: "10px 18px",
    borderRadius: 8,
    border: primary ? "none" : `1px solid ${tk.border}`,
    background: primary ? tk.accent : tk.surface,
    color: primary ? tk.accentFg : tk.text,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <div className="solver-bleed">
      <style>{`main:has(.solver-bleed){max-width:1720px !important;}`}</style>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: tk.text3, fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "4px 0", marginBottom: 12 }}
        >
          ← Back to problems
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-0.03em", color: tk.text, margin: "0 0 8px" }}>
              {problem.title}
            </h1>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: diffBg, color: diffColor }}>
                {problem.difficulty}
              </span>
              {(problem.topicTags || []).slice(0, 4).map((tag) => (
                <span key={tag} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: tk.bgAlt, color: tk.text2, border: `1px solid ${tk.border}` }}>
                  {tag}
                </span>
              ))}
              {solved && (
                <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: tk.greenLight, color: tk.green }}>
                  ✓ Solved
                </span>
              )}
              {leetcodeMode && qdata && qdata.method.name && (
                <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: tk.bgAlt, color: tk.text2, border: `1px solid ${tk.border}`, fontFamily: "monospace" }}>
                  Solution.{qdata.method.name}({qdata.method.params.map((prm) => prm.name).join(", ")})
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={leetcodeUrl} target="_blank" rel="noopener noreferrer" style={{ ...btn(false), textDecoration: "none", display: "inline-block" }}>
              See on LeetCode →
            </a>
            <button onClick={onSolved} disabled={solved} style={{ ...btn(true), opacity: solved ? 0.5 : 1, cursor: solved ? "default" : "pointer" }}>
              {solved ? "✓ Solved" : "Mark solved"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: problem statement */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ border: `1px solid ${tk.border}`, borderRadius: 12, overflow: "hidden" }}>
            <button
              onClick={() => setShowStatement((s) => !s)}
              style={{ width: "100%", padding: "14px 18px", background: tk.bgAlt, border: "none", borderBottom: showStatement ? `1px solid ${tk.border}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tk.text }}
            >
              Problem
              <span style={{ fontSize: 12, color: tk.text3 }}>{showStatement ? "▲ Hide" : "▼ Show"}</span>
            </button>
            {showStatement && (
              <div style={{ padding: "6px 18px 16px" }}>
                {qloading && <div style={{ fontSize: 13, color: tk.text3, padding: "12px 0" }}>Loading full question…</div>}
                {!qloading && qdata && qdata.content ? (
                  <>
                    <style>{`
                      .lc-statement { font-size: 13.5px; line-height: 1.65; color: ${tk.text2}; }
                      .lc-statement p { margin: 10px 0; }
                      .lc-statement pre { background: ${tk.bg}; border: 1px solid ${tk.border}; border-radius: 8px; padding: 12px; overflow-x: auto; font-size: 12.5px; white-space: pre-wrap; word-break: break-word; }
                      .lc-statement code { background: ${tk.bg}; border: 1px solid ${tk.border}; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
                      .lc-statement pre code { background: none; border: none; padding: 0; }
                      .lc-statement ul, .lc-statement ol { padding-left: 20px; margin: 8px 0; }
                      .lc-statement li { margin: 4px 0; }
                      .lc-statement img { max-width: 100%; border-radius: 8px; }
                      .lc-statement strong { color: ${tk.text}; }
                    `}</style>
                    <div className="lc-statement" dangerouslySetInnerHTML={{ __html: sanitizeLeetCodeHtml(qdata.content) }} />
                  </>
                ) : (
                  !qloading && (
                    <div style={{ fontSize: 13, color: tk.text3, padding: "12px 0" }}>
                      Full statement unavailable — open it on LeetCode instead.
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: playground card + separate review box */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ border: `1px solid ${tk.border}`, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", background: tk.bgAlt, borderBottom: `1px solid ${tk.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Lang)}
              style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${tk.border}`, background: tk.surface, color: tk.text, fontSize: 13, fontWeight: 600, outline: "none", cursor: "pointer" }}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button
              onClick={leetcodeMode ? handleRunLeetCode : handleRun}
              disabled={runDisabled}
              title={qdata && !leetcodeMode ? "Official runs support Python, JavaScript and TypeScript" : undefined}
              style={{ ...btn(true), opacity: runDisabled ? 0.5 : 1 }}
            >
              {busy ? "Running…" : "▶ Run"}
            </button>
            <button
              onClick={handleSolutionClick}
              disabled={aiLoading}
              style={{ ...btn(false), opacity: aiLoading ? 0.6 : 1 }}
            >
              {aiLoading ? "Thinking…" : "Solution"}
            </button>
            {aiComplexity?.time && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, background: tk.blueLight, color: tk.blue, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                Time {aiComplexity.time}
              </span>
            )}
            {aiComplexity?.space && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 6, background: tk.blueLight, color: tk.blue, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                Space {aiComplexity.space}
              </span>
            )}
          </div>
          <CodeEditor language={language} code={code} onChange={setCode} onRun={leetcodeMode ? handleRunLeetCode : handleRun} dark={dark} height={isMobile ? 320 : 440} />
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {aiError && <div style={{ fontSize: 13, color: tk.rose }}>{aiError}</div>}

            {/* Run verdict (official examples) */}
            {leetcodeMode && (testing || testError || lcResults) && (
              <div style={{ border: `1px solid ${tk.border}`, borderRadius: 8, overflow: "hidden" }}>
                {testing && <div style={{ padding: "12px 14px", fontSize: 13, color: tk.text3 }}>Running official examples…</div>}
                {testError && <div style={{ padding: "12px 14px", fontSize: 13, color: tk.rose }}>{testError}</div>}
                {lcResults && (
                  <div>
                    <div style={{
                      padding: "10px 14px", fontSize: 13, fontWeight: 700,
                      color: lcPassed === lcResults.length ? tk.green : tk.rose,
                      background: lcPassed === lcResults.length ? tk.greenLight : tk.roseLight,
                    }}>
                      {lcPassed === lcResults.length
                        ? `✓ Accepted — ${lcPassed}/${lcResults.length} examples passed`
                        : `${lcPassed}/${lcResults.length} examples passed`}
                    </div>
                    {lcResults.map((res, i) => (
                      !res.pass && (
                        <div key={i} style={{ padding: "10px 14px", borderTop: `1px solid ${tk.border}`, fontSize: 12, fontFamily: "monospace", color: tk.text2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          <div style={{ fontWeight: 700, color: tk.rose, fontFamily: "inherit", marginBottom: 4 }}>Example {i + 1} failed</div>
                          <div>Input: {res.input.split("\n").join(" | ")}</div>
                          <div>Expected: {res.expected}</div>
                          <div>{res.error ? `Error: ${res.error}` : `Got: ${res.actual || "(empty output)"}`}</div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}

            {!leetcodeMode && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: tk.text2 }}>
                  Custom input (stdin for ▶ Run)
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    rows={3}
                    placeholder="stdin for a quick manual run…"
                    spellCheck={false}
                    style={{ width: "100%", marginTop: 6, padding: 10, borderRadius: 8, border: `1px solid ${tk.border}`, background: tk.bg, color: tk.text, fontSize: 13, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }}
                  />
                </label>
                {runError && <div style={{ fontSize: 13, color: tk.rose }}>{runError}</div>}
                {output && (
                  <div style={{ background: "#0d1117", borderRadius: 8, padding: 12, fontSize: 12, fontFamily: "monospace", color: "#e6edf3", maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {output.compile && <div style={{ color: "#f0883e", marginBottom: 8 }}>{output.compile}</div>}
                    {output.stdout && <div>{output.stdout}</div>}
                    {output.stderr && <div style={{ color: "#ff7b72" }}>{output.stderr}</div>}
                    {!output.stdout && !output.stderr && !output.compile && <div style={{ color: "#8b949e" }}>(no output)</div>}
                    <div style={{ color: "#8b949e", marginTop: 8 }}>
                      exit {output.exit ?? "?"} {output.ms != null ? `· ${output.ms} ms` : ""}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

          {/* DSA mentor review — its own separate box below the playground */}
          <div style={{ border: `1.5px solid ${tk.purpleBorder}`, borderRadius: 12, overflow: "hidden", boxShadow: `0 0 0 3px ${tk.purpleLight}`, background: tk.surface, flexShrink: 0 }}>
              <div style={{ padding: "12px 16px", background: tk.purpleLight, borderBottom: `1px solid ${tk.purpleBorder}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: tk.purple }}>Mentor Review</span>
                {reviewText && (() => {
                  const rc = extractReviewComplexity(reviewText);
                  return (
                    <>
                      {rc.time && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: tk.surface, color: tk.text, border: `1px solid ${tk.purpleBorder}`, fontFamily: "monospace" }}>
                          Time {rc.time}
                        </span>
                      )}
                      {rc.space && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: tk.surface, color: tk.text, border: `1px solid ${tk.purpleBorder}`, fontFamily: "monospace" }}>
                          Space {rc.space}
                        </span>
                      )}
                    </>
                  );
                })()}
                <button
                  onClick={() => fetchReview(reviewMode)}
                  disabled={reviewLoading}
                  title="Review your current code"
                  style={{ padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", background: tk.purple, color: "#fff" }}
                >
                  {reviewLoading ? "Reviewing…" : reviewText ? "Re-review" : "Review my code"}
                </button>
                <button
                  onClick={handleOptimize}
                  disabled={optLoading}
                  title="Rewrite your code for better time/space complexity and load it into the editor"
                  style={{ padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${tk.greenBorder}`, background: tk.greenLight, color: tk.green }}
                >
                  {optLoading ? "Optimizing…" : "Optimize"}
                </button>
                <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                  {(["learning", "full"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => switchReviewMode(m)}
                      disabled={reviewLoading}
                      style={{
                        padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                        border: `1px solid ${reviewMode === m ? tk.blue : tk.border}`,
                        background: reviewMode === m ? tk.blueLight : tk.surface,
                        color: reviewMode === m ? tk.blue : tk.text3,
                      }}
                    >
                      {m === "learning" ? "Learn (hints)" : "Full solution"}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "4px 16px 16px" }}>
                {optMsg && <div style={{ fontSize: 12, color: tk.green, padding: "8px 0 0", fontWeight: 600 }}>{optMsg}</div>}
                {reviewLoading && !reviewText && (
                  <div style={{ fontSize: 13, color: tk.text3, padding: "12px 0" }}>Reviewing your solution…</div>
                )}
                {reviewError && <div style={{ fontSize: 13, color: tk.rose, padding: "8px 0" }}>{reviewError}</div>}
                {reviewText && (() => {
                  const verdict = extractVerdict(reviewText);
                  return (
                    <>
                      {verdict && (
                        <div style={{ margin: "10px 0 4px", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: verdictColor(verdict, tk), background: tk.bgAlt, border: `1px solid ${tk.border}` }}>
                          Verdict: {verdict.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                      )}
                      {renderReviewMarkdown(reviewText, tk)}
                    </>
                  );
                })()}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
