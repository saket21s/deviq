"use client";
import { useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";

// Pin a known-good Monaco build so the editor never breaks on a bad CDN day.
loader.config({
  paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/min/vs" },
});

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
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = false;
    setLoadFailed(false);
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

  if (loadFailed) {
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
        </div>
      </div>
    );
  }

  return (
    <div id="deviq-code-editor" style={{ height, minHeight: 380 }}>
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
    </div>
  );
}
