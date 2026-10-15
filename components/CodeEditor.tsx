"use client";
import { Component, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

// Pin a known-good Monaco build so the editor never breaks on a bad CDN day.
// Guarded: configuring the loader twice (StrictMode remounts) disposes the
// IoC container and crashes with "InstantiationService has been disposed".
let monacoConfigured = false;
if (!monacoConfigured) {
  monacoConfigured = true;
  loader.config({
    paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/min/vs" },
  });
}

const MONACO_LANG: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  csharp: "csharp",
  kotlin: "kotlin",
};

// Catches Monaco crashes (e.g. "InstantiationService has been disposed"
// from StrictMode remounts) and falls back to a plain textarea instead of
// taking down the whole page.
class MonacoErrorBoundary extends Component<{
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  dark: boolean;
  children: ReactNode;
}> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.error("Monaco crashed, using basic editor:", err);
  }

  render() {
    if (this.state.failed) {
      const { code, onChange, onRun, dark } = this.props;
      return (
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onRun();
            }
          }}
          spellCheck={false}
          aria-label="Code editor. Press Control Enter to run."
          style={{
            width: "100%",
            height: "100%",
            minHeight: 380,
            boxSizing: "border-box",
            padding: 14,
            border: "none",
            outline: "none",
            resize: "none",
            background: dark ? "#1e1e1e" : "#ffffff",
            color: dark ? "#d4d4d4" : "#1e1e1e",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          }}
        />
      );
    }
    return this.props.children;
  }
}

export default function CodeEditor({
  language,
  code,
  onChange,
  onRun,
  dark,
  height = 420,
}: {
  language: string;
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  dark: boolean;
  height?: number;
}) {
  const onRunRef = useRef(onRun);
  onRunRef.current = onRun;

  // If the Monaco CDN can't load (offline/blocked scripts), don't hang on
  // the spinner forever — surface a retry instead of a dead editor.
  const [loadFailed, setLoadFailed] = useState(false);
  const [basicEditor, setBasicEditor] = useState(false);
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = false;
    setLoadFailed(false);
    setBasicEditor(false);
    const t = setTimeout(() => {
      if (!mountedRef.current) setLoadFailed(true);
    }, 20000);
    return () => clearTimeout(t);
  }, [language]);

  // Remind screen readers / keyboard users of the run shortcut.
  useEffect(() => {
    const el = document.getElementById("deviq-code-editor");
    if (el) el.setAttribute("aria-label", "Code editor. Press Control Enter to run.");
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    mountedRef.current = true;
    // Ctrl/Cmd + Enter runs the code, same as before.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current();
    });
  };

  if (loadFailed && !basicEditor) {
    return (
      <div id="deviq-code-editor" style={{ height, minHeight: 380 }}>
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontSize: 13,
            color: "#888",
            textAlign: "center",
            padding: 20,
          }}
        >
          <div>Editor failed to load. Check your connection, then retry.</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "1px solid #444",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Retry
            </button>
            <button
              onClick={() => setBasicEditor(true)}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                background: "#fff",
                color: "#000",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Use basic editor
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (basicEditor) {
    return (
      <div id="deviq-code-editor" style={{ height, minHeight: 380 }}>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              onRunRef.current();
            }
          }}
          spellCheck={false}
          aria-label="Code editor. Press Control Enter to run."
          style={{
            width: "100%",
            height: "100%",
            minHeight: 380,
            boxSizing: "border-box",
            padding: 14,
            border: "none",
            outline: "none",
            resize: "none",
            background: dark ? "#1e1e1e" : "#ffffff",
            color: dark ? "#d4d4d4" : "#1e1e1e",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          }}
        />
      </div>
    );
  }

  return (
    <div id="deviq-code-editor" style={{ height, minHeight: 380 }}>
      <MonacoErrorBoundary
        key={language}
        code={code}
        onChange={onChange}
        onRun={() => onRunRef.current()}
        dark={dark}
      >
      <Editor
        height="100%"
        language={MONACO_LANG[language] ?? "plaintext"}
        value={code}
        theme={dark ? "vs-dark" : "vs"}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        loading={
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "#888",
            }}
          >
            Loading VS Code editor…
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 14 },
          wordWrap: "off",
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabCompletion: "on",
          acceptSuggestionOnEnter: "on",
          renderLineHighlight: "all",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          stickyScroll: { enabled: false },
          contextmenu: true,
          ariaLabel: "Code editor",
        }}
      />
      </MonacoErrorBoundary>
    </div>
  );
}
