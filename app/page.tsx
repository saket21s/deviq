"use client";
import { useState, useEffect, CSSProperties, ReactNode } from "react";

const API = "https://developer-portfolio-backend-bu76.onrender.com";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
type Theme = typeof THEMES.light;

interface StepItem { label: string; status: "pending"|"active"|"done"|"error"; }

interface RepoItem { name: string; stars: number; forks: number; language?: string; }

interface GithubAnalytics {
  total_projects: number;
  total_stars: number;
  recent_projects: number;
  skill_score: number;
  most_used_language?: string;
  language_distribution?: Record<string, number>;
}

interface GithubData   { analytics?: GithubAnalytics; repositories?: RepoItem[]; }
interface LeetcodeData {
  total_solved: number; easy_solved: number; medium_solved: number; hard_solved: number;
  ranking?: number; contest_rating?: number; contests_attended?: number;
  top_percentage?: number; badges?: number;
}
interface CodeforcesData {
  rating: number; max_rating?: number; rank?: string; max_rank?: string;
  problems_solved?: number; contests_participated?: number; contribution?: number;
}
interface ResultData {
  github?: GithubData; leetcode?: LeetcodeData; codeforces?: CodeforcesData;
  combined_score: number;
}

/* ═══════════════════════════════════════════════════
   THEME TOKENS
═══════════════════════════════════════════════════ */
const THEMES = {
  light: {
    pageBg:       "#FAFAF7",
    meshA:        "rgba(99,102,241,0.06)",
    meshB:        "rgba(16,185,129,0.05)",
    meshC:        "rgba(245,158,11,0.04)",
    card:         "#FFFFFF",
    cardHov:      "#FDFDFB",
    cardBorder:   "#E8E6E0",
    cardBorder2:  "#D4D1C8",
    inset:        "#F5F4F0",
    ink:          "#18181B",
    ink2:         "#52525B",
    ink3:         "#A1A1AA",
    ink4:         "#D4D4D8",
    blue:         "#4F46E5",
    blueGlow:     "rgba(79,70,229,0.15)",
    blueLight:    "#EEF2FF",
    blueBorder:   "#C7D2FE",
    teal:         "#0D9488",
    tealLight:    "#F0FDFA",
    tealBorder:   "#99F6E4",
    amber:        "#D97706",
    amberLight:   "#FFFBEB",
    amberBorder:  "#FDE68A",
    rose:         "#E11D48",
    roseLight:    "#FFF1F2",
    roseBorder:   "#FECDD3",
    purple:       "#7C3AED",
    purpleLight:  "#F5F3FF",
    purpleBorder: "#DDD6FE",
    green:        "#059669",
    greenLight:   "#ECFDF5",
    greenBorder:  "#A7F3D0",
    pillBg:       "#F4F4F5",
    shadow1:      "0 1px 2px rgba(0,0,0,0.04)",
    shadow2:      "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    shadow3:      "0 20px 60px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)",
    ringTrack:    "#E4E4E7",
    divider:      "#E8E6E0",
    statStripe:   "#FAFAFA",
  },
  dark: {
    pageBg:       "#09090B",
    meshA:        "rgba(99,102,241,0.12)",
    meshB:        "rgba(16,185,129,0.08)",
    meshC:        "rgba(245,158,11,0.06)",
    card:         "#111114",
    cardHov:      "#16161A",
    cardBorder:   "#27272A",
    cardBorder2:  "#3F3F46",
    inset:        "#18181B",
    ink:          "#FAFAFA",
    ink2:         "#A1A1AA",
    ink3:         "#52525B",
    ink4:         "#3F3F46",
    blue:         "#818CF8",
    blueGlow:     "rgba(129,140,248,0.2)",
    blueLight:    "rgba(129,140,248,0.08)",
    blueBorder:   "rgba(129,140,248,0.25)",
    teal:         "#2DD4BF",
    tealLight:    "rgba(45,212,191,0.08)",
    tealBorder:   "rgba(45,212,191,0.25)",
    amber:        "#FCD34D",
    amberLight:   "rgba(252,211,77,0.08)",
    amberBorder:  "rgba(252,211,77,0.25)",
    rose:         "#FB7185",
    roseLight:    "rgba(251,113,133,0.08)",
    roseBorder:   "rgba(251,113,133,0.25)",
    purple:       "#C084FC",
    purpleLight:  "rgba(192,132,252,0.08)",
    purpleBorder: "rgba(192,132,252,0.25)",
    green:        "#34D399",
    greenLight:   "rgba(52,211,153,0.08)",
    greenBorder:  "rgba(52,211,153,0.25)",
    pillBg:       "#18181B",
    shadow1:      "0 1px 2px rgba(0,0,0,0.4)",
    shadow2:      "0 4px 16px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
    shadow3:      "0 24px 80px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4)",
    ringTrack:    "#27272A",
    divider:      "#27272A",
    statStripe:   "#0D0D10",
  },
};

/* ═══════════════════════════════════════════════════
   ANIMATED COUNTER
═══════════════════════════════════════════════════ */
function useCounter(target: number, duration = 1600): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    setV(0);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      setV(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return v;
}

/* ═══════════════════════════════════════════════════
   SCORE RING
═══════════════════════════════════════════════════ */
function ScoreRing({ score, tk }: { score: number; tk: Theme }) {
  const c = useCounter(Math.round(score));
  const R = 54, circ = 2 * Math.PI * R;
  const pct = c / 100;
  const color = c >= 80 ? tk.green : c >= 60 ? tk.blue : c >= 40 ? tk.amber : tk.rose;
  return (
    <div style={{ position:"relative", width:148, height:148 }}>
      <svg width="148" height="148" viewBox="0 0 148 148" style={{ transform:"rotate(-90deg)", display:"block" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.5"/>
          </linearGradient>
        </defs>
        <circle cx="74" cy="74" r={R} fill="none" stroke={tk.ringTrack} strokeWidth="7"/>
        <circle cx="74" cy="74" r={R} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          opacity="0.15"
          style={{ filter:"blur(4px)", transition:"stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
        <circle cx="74" cy="74" r={R} fill="none" stroke="url(#ringGrad)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          style={{ transition:"stroke-dashoffset 1.6s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
        <span style={{ fontFamily:"'Clash Display',sans-serif", fontSize:42, fontWeight:700, color, lineHeight:1, letterSpacing:"-0.03em" }}>{c}</span>
        <span style={{ fontSize:11, color:tk.ink3, fontWeight:600, letterSpacing:"0.12em" }}>/ 100</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STAT ROW
═══════════════════════════════════════════════════ */
function StatRow({ label, value, accent, tk, stripe }: {
  label: string; value: string|number|undefined; accent?: string|null;
  tk: Theme; stripe: boolean;
}) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background: stripe ? tk.statStripe : "transparent", borderBottom:`1px solid ${tk.divider}` }}>
      <span style={{ fontSize:11, color:tk.ink3, fontWeight:500, letterSpacing:"0.02em" }}>{label}</span>
      <span style={{ fontSize:13, fontWeight:700, color: accent || tk.ink, letterSpacing:"-0.02em" }}>{value ?? "—"}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LANG BARS
═══════════════════════════════════════════════════ */
function LangBars({ data, tk }: { data: Record<string, number>; tk: Theme }) {
  const entries = Object.entries(data).slice(0, 6);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div style={{ padding:"14px 16px 16px" }}>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:tk.ink3, marginBottom:12 }}>Languages</div>
      {entries.map(([lang, cnt]) => (
        <div key={lang} style={{ marginBottom:9 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
            <span style={{ fontSize:11, color:tk.ink2, fontWeight:600 }}>{lang}</span>
            <span style={{ fontSize:10, color:tk.ink3 }}>{cnt}</span>
          </div>
          <div style={{ height:4, borderRadius:99, background:tk.ringTrack, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:99, width:`${(cnt/max)*100}%`, backgroundImage:`linear-gradient(90deg, ${tk.blue}, ${tk.teal})`, transition:"width 1.5s cubic-bezier(0.34,1.56,0.64,1)" }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PLATFORM CARD
═══════════════════════════════════════════════════ */
function PlatformCard({ title, handle, accentColor, accentLight, accentBorder, children, tk, empty }: {
  title: string; handle: string; accentColor: string; accentLight: string;
  accentBorder: string; children?: ReactNode; tk: Theme; empty: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background:tk.card, borderRadius:20, border:`1px solid ${hov ? accentBorder : tk.cardBorder}`, overflow:"hidden", boxShadow: hov ? `${tk.shadow2}, 0 0 0 1px ${accentBorder}` : tk.shadow1, transition:"all 0.25s ease", transform: hov ? "translateY(-3px)" : "none", display:"flex", flexDirection:"column" }}
    >
      <div style={{ padding:"16px 18px", borderBottom:`1px solid ${tk.divider}`, background:tk.inset, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:accentLight, border:`1px solid ${accentBorder}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:10, height:10, borderRadius:"50%", background:accentColor }}/>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:accentColor, letterSpacing:"-0.02em", fontFamily:"'Clash Display',sans-serif" }}>{title}</div>
            {handle && <div style={{ fontSize:10, color:tk.ink3, fontWeight:500 }}>@{handle}</div>}
          </div>
        </div>
        <div style={{ width:6, height:6, borderRadius:"50%", background:accentColor, opacity:0.5, boxShadow:`0 0 6px ${accentColor}` }}/>
      </div>
      {empty ? (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:220, gap:10, opacity:0.25 }}>
          <div style={{ fontSize:32 }}>○</div>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.24em", textTransform:"uppercase", color:tk.ink3 }}>Not connected</div>
        </div>
      ) : children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INPUT FIELD
═══════════════════════════════════════════════════ */
function InputField({ label, desc, color, colorLight, colorBorder, value, onChange, onEnter, tk }: {
  label: string; desc: string; color: string; colorLight: string; colorBorder: string;
  value: string; onChange: (v: string) => void; onEnter: () => void; tk: Theme;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ background:tk.card, border:`1.5px solid ${focused ? colorBorder : tk.cardBorder}`, borderRadius:16, overflow:"hidden", boxShadow: focused ? `0 0 0 3px ${colorLight}, ${tk.shadow1}` : tk.shadow1, transition:"all 0.2s ease" }}>
      <div style={{ padding:"12px 16px 10px", borderBottom:`1px solid ${tk.divider}`, background:tk.inset }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, fontWeight:800, color, letterSpacing:"-0.01em", fontFamily:"'Clash Display',sans-serif" }}>{label}</span>
          <span style={{ fontSize:9, color:tk.ink3, letterSpacing:"0.06em" }}>{desc}</span>
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", padding:"13px 16px", gap:6 }}>
        <span style={{ fontSize:14, color:tk.ink4, userSelect:"none", fontWeight:600 }}>@</span>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onEnter()}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={label === "Codeforces" ? "handle" : "username"}
          spellCheck={false}
          autoComplete="off"
          style={{ flex:1, border:"none", outline:"none", background:"transparent", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:600, color:tk.ink }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   BACKGROUND MESH
═══════════════════════════════════════════════════ */
function BgMesh({ tk }: { tk: Theme }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
      <div style={{ position:"absolute", width:"70vw", height:"70vw", maxWidth:800, maxHeight:800, borderRadius:"50%", top:"-30%", left:"50%", transform:"translateX(-50%)", background:`radial-gradient(circle, ${tk.meshA} 0%, transparent 70%)` }}/>
      <div style={{ position:"absolute", width:"50vw", height:"50vw", maxWidth:600, maxHeight:600, borderRadius:"50%", bottom:"5%", right:"-10%", background:`radial-gradient(circle, ${tk.meshB} 0%, transparent 70%)` }}/>
      <div style={{ position:"absolute", width:"40vw", height:"40vw", maxWidth:500, maxHeight:500, borderRadius:"50%", top:"40%", left:"-8%", background:`radial-gradient(circle, ${tk.meshC} 0%, transparent 70%)` }}/>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${tk.divider} 1px, transparent 1px), linear-gradient(90deg, ${tk.divider} 1px, transparent 1px)`, backgroundSize:"60px 60px", opacity:0.35, maskImage:"radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 80%)", WebkitMaskImage:"radial-gradient(ellipse 80% 60% at 50% 0%, black 20%, transparent 80%)" }}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   REPO CARD
═══════════════════════════════════════════════════ */
function RepoCard({ repo, tk }: { repo: RepoItem; tk: Theme }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ padding:"18px 20px", borderRight:`1px solid ${tk.divider}`, borderBottom:`1px solid ${tk.divider}`, background: hov ? tk.inset : "transparent", cursor:"default", transition:"background 0.15s" }}
    >
      <div style={{ fontSize:13, fontWeight:700, color:tk.ink, marginBottom:8, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", letterSpacing:"-0.01em" }}>{repo.name}</div>
      <div style={{ display:"flex", gap:12, fontSize:11, color:tk.ink3, fontWeight:600, marginBottom:8 }}>
        <span>★ {repo.stars}</span>
        <span>⑂ {repo.forks}</span>
      </div>
      {repo.language && (
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:tk.blue, padding:"2px 8px", borderRadius:4, background:tk.blueLight, border:`1px solid ${tk.blueBorder}` }}>
          {repo.language}
        </span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════ */
function getRank(s: number, tk: Theme) {
  if (s >= 85) return { label:"Elite Engineer",   color:tk.green,  bg:tk.greenLight,  border:tk.greenBorder,  emoji:"🏆" };
  if (s >= 70) return { label:"Senior Developer", color:tk.blue,   bg:tk.blueLight,   border:tk.blueBorder,   emoji:"⚡" };
  if (s >= 55) return { label:"Mid-level Dev",    color:tk.purple, bg:tk.purpleLight, border:tk.purpleBorder, emoji:"🚀" };
  if (s >= 35) return { label:"Junior Developer", color:tk.amber,  bg:tk.amberLight,  border:tk.amberBorder,  emoji:"📈" };
  return              { label:"Early Stage",      color:tk.rose,   bg:tk.roseLight,   border:tk.roseBorder,   emoji:"🌱" };
}

function getVerdict(s: number): string {
  if (s >= 85) return "Exceptional across all dimensions. Top-tier engineering talent.";
  if (s >= 70) return "Strong. Proficient and consistent across every platform.";
  if (s >= 55) return "Solid foundation. A developer actively levelling up.";
  if (s >= 35) return "Early career with real momentum and clear potential.";
  return "Just starting out. Every expert was once a beginner.";
}

function cfColor(rank: string|undefined, tk: Theme): string {
  const r = (rank || "").toLowerCase();
  if (r.includes("grandmaster") || r.includes("legendary")) return tk.rose;
  if (r.includes("master"))    return tk.amber;
  if (r.includes("candidate")) return tk.purple;
  if (r.includes("expert"))    return tk.blue;
  if (r.includes("specialist"))return tk.teal;
  if (r.includes("pupil"))     return tk.green;
  return tk.ink3;
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════ */
export default function Page() {
  const [dark, setDark] = useState(false);
  const tk = dark ? THEMES.dark : THEMES.light;

  const [gh, setGh] = useState("");
  const [lc, setLc] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps]     = useState<StepItem[]>([]);
  const [data, setData]       = useState<ResultData|null>(null);
  const [errors, setErrors]   = useState<string[]>([]);

  const analyze = async () => {
    if (!gh && !lc && !cf) return;
    setLoading(true); setData(null); setErrors([]);
    const init: StepItem[] = [
      ...(gh ? [{ label:"GitHub",     status:"pending" as const }] : []),
      ...(lc ? [{ label:"LeetCode",   status:"pending" as const }] : []),
      ...(cf ? [{ label:"Codeforces", status:"pending" as const }] : []),
    ];
    let cur = [...init]; setSteps(cur);
    const upd = (i: number, s: StepItem["status"]) => {
      cur = cur.map((x,j) => j===i ? {...x,status:s} : x); setSteps([...cur]);
    };
    const errs: string[] = [], result: Partial<ResultData> = {}; let si = 0;
    if (gh) {
      upd(si,"active");
      try { const r = await fetch(`${API}/analyze/${gh.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok||j.error) throw new Error(j.error||`HTTP ${r.status}`); result.github=j; upd(si,"done"); }
      catch(e: unknown) { upd(si,"error"); errs.push(`GitHub: ${e instanceof Error ? e.message : String(e)}`); } si++;
    }
    if (lc) {
      upd(si,"active");
      try { const r = await fetch(`${API}/leetcode/${lc.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok||j.error) throw new Error(j.error||`HTTP ${r.status}`); result.leetcode=j; upd(si,"done"); }
      catch(e: unknown) { upd(si,"error"); errs.push(`LeetCode: ${e instanceof Error ? e.message : String(e)}`); } si++;
    }
    if (cf) {
      upd(si,"active");
      try { const r = await fetch(`${API}/codeforces/${cf.trim()}?v=${Date.now()}`); const j = await r.json(); if (!r.ok||j.error) throw new Error(j.error||`HTTP ${r.status}`); result.codeforces=j; upd(si,"done"); }
      catch(e: unknown) { upd(si,"error"); errs.push(`Codeforces: ${e instanceof Error ? e.message : String(e)}`); }
    }
    let score = 0;
    if (result.github?.analytics?.skill_score) score += result.github.analytics.skill_score * 0.4;
    if (result.leetcode?.total_solved) score += Math.min(100, result.leetcode.easy_solved + result.leetcode.medium_solved*3 + result.leetcode.hard_solved*6) * 0.35;
    if (result.codeforces?.rating) score += Math.min(100, result.codeforces.rating/35) * 0.25;
    result.combined_score = Math.round(score * 10) / 10;
    setErrors(errs); setData(result as ResultData); setLoading(false);
  };

  const sIcon = (s: StepItem["status"]) => ({ done:"✓", error:"✗", active:"◉", pending:"○" }[s]);
  const stepColor = (s: StepItem["status"]) => s==="active" ? tk.blue : s==="done" ? tk.green : s==="error" ? tk.rose : tk.ink4;
  const stepBg    = (s: StepItem["status"]) => s==="active" ? tk.blueLight : s==="done" ? tk.greenLight : s==="error" ? tk.roseLight : "transparent";
  const stepBdr   = (s: StepItem["status"]) => s==="active" ? tk.blueBorder : s==="done" ? tk.greenBorder : s==="error" ? tk.roseBorder : tk.cardBorder;

  const tagStyle = (color: string, bg: string, border: string): CSSProperties => ({
    fontSize:10, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase",
    padding:"5px 13px", borderRadius:6, border:`1px solid ${border}`, color, background:bg,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        @import url('https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body { margin:0; -webkit-font-smoothing:antialiased; font-family:'Plus Jakarta Sans',sans-serif; }
        input { font-family:'Plus Jakarta Sans',sans-serif; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes scalePop { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        .fadeUp  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .fadeUp1 { animation-delay:0.08s; }
        .fadeUp2 { animation-delay:0.16s; }
        .fadeUp3 { animation-delay:0.24s; }
        .scalePop  { animation: scalePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
        .scalePop1 { animation-delay:0.1s; }
        .scalePop2 { animation-delay:0.2s; }
      `}</style>

      <div style={{ minHeight:"100vh", background:tk.pageBg, color:tk.ink, fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"background 0.4s, color 0.4s", position:"relative" }}>
        <BgMesh tk={tk}/>

        <div style={{ position:"relative", zIndex:1, maxWidth:1100, margin:"0 auto", padding:"0 28px 120px" }}>

          {/* ── TOPBAR ── */}
          <header className="fadeUp" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"24px 0", marginBottom:72, borderBottom:`1px solid ${tk.divider}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:10, backgroundImage:`linear-gradient(135deg, ${tk.blue}, ${tk.purple})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 12px ${tk.blueGlow}` }}>
                <span style={{ fontFamily:"'Clash Display',sans-serif", fontSize:17, fontWeight:700, color:"#fff" }}>D</span>
              </div>
              <div>
                <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:18, fontWeight:700, color:tk.ink, letterSpacing:"-0.03em", lineHeight:1 }}>DevIQ</div>
                <div style={{ fontSize:9, color:tk.ink3, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", marginTop:1 }}>Intelligence Engine</div>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 14px", borderRadius:99, background:tk.pillBg, border:`1px solid ${tk.cardBorder}`, fontSize:11, fontWeight:600, color:tk.ink2 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:tk.green, boxShadow:`0 0 8px ${tk.green}`, animation:"livePulse 2s ease-in-out infinite" }}/>
                All systems live
              </div>
              <button
                onClick={() => setDark(d => !d)}
                style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderRadius:99, border:`1.5px solid ${tk.cardBorder}`, background:tk.card, cursor:"pointer", fontSize:12, fontWeight:700, color:tk.ink2, letterSpacing:"0.02em", transition:"all 0.2s", boxShadow:tk.shadow1 }}
              >
                <span style={{ fontSize:14 }}>{dark ? "☀️" : "🌙"}</span>
                {dark ? "Light" : "Dark"}
              </button>
            </div>
          </header>

          {/* ── HERO ── */}
          <section style={{ marginBottom:80, display:"grid", gridTemplateColumns:"1fr auto", alignItems:"end", gap:40 }}>
            <div>
              <div className="fadeUp" style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:20, padding:"6px 14px", borderRadius:99, background:tk.blueLight, border:`1px solid ${tk.blueBorder}` }}>
                <div style={{ width:5, height:5, borderRadius:"50%", background:tk.blue, animation:"livePulse 2s ease-in-out infinite" }}/>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:tk.blue }}>Multi-Platform Developer Analytics</span>
              </div>
              <h1 className="fadeUp fadeUp1" style={{ fontFamily:"'Clash Display',sans-serif", fontWeight:700, fontSize:"clamp(44px,6vw,80px)", lineHeight:1.0, letterSpacing:"-0.04em", color:tk.ink, marginBottom:24 }}>
                <span style={{ display:"block" }}>Know your real</span>
                <span style={{ display:"block", backgroundImage:`linear-gradient(135deg, ${tk.blue} 0%, ${tk.purple} 50%, ${tk.teal} 100%)`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                  developer score.
                </span>
              </h1>
              <p className="fadeUp fadeUp2" style={{ fontSize:16, color:tk.ink2, lineHeight:1.75, maxWidth:500, fontWeight:400 }}>
                Connect GitHub, LeetCode &amp; Codeforces. Get a unified intelligence score backed by real data — not self-reported skills.
              </p>
            </div>
            <div className="fadeUp fadeUp3" style={{ display:"flex", flexDirection:"column", gap:0, background:tk.card, border:`1px solid ${tk.cardBorder}`, borderRadius:20, overflow:"hidden", boxShadow:tk.shadow2, minWidth:160 }}>
              {([{ num:"3", label:"Platforms" }, { num:"100", label:"Point Scale" }, { num:"∞", label:"Insights" }] as const).map((s, i, arr) => (
                <div key={s.label} style={{ padding:"18px 24px", borderBottom: i < arr.length-1 ? `1px solid ${tk.divider}` : "none", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:32, fontWeight:700, color:tk.ink, letterSpacing:"-0.04em", lineHeight:1 }}>{s.num}</div>
                  <div style={{ fontSize:9, color:tk.ink3, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── INPUTS ── */}
          <div className="fadeUp fadeUp2" style={{ marginBottom:56 }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:tk.ink3, marginBottom:12, paddingLeft:2 }}>Connect your profiles</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:12 }}>
              <InputField label="GitHub"     desc="Repos · Stars · Langs"      color={tk.blue}   colorLight={tk.blueLight}   colorBorder={tk.blueBorder}   value={gh} onChange={setGh} onEnter={analyze} tk={tk}/>
              <InputField label="LeetCode"   desc="Problems · Rank · Contests"  color={tk.amber}  colorLight={tk.amberLight}  colorBorder={tk.amberBorder}  value={lc} onChange={setLc} onEnter={analyze} tk={tk}/>
              <InputField label="Codeforces" desc="Rating · Contests · Rank"    color={tk.purple} colorLight={tk.purpleLight} colorBorder={tk.purpleBorder} value={cf} onChange={setCf} onEnter={analyze} tk={tk}/>
            </div>
            <button
              onClick={analyze}
              disabled={loading || (!gh && !lc && !cf)}
              style={{
                width:"100%", padding:17, border:"none", borderRadius:16,
                cursor:(loading||(!gh&&!lc&&!cf)) ? "not-allowed" : "pointer",
                fontFamily:"'Clash Display',sans-serif", fontSize:16, fontWeight:700, letterSpacing:"-0.01em",
                backgroundImage:(loading||(!gh&&!lc&&!cf)) ? "none" : `linear-gradient(135deg, ${tk.blue}, ${tk.purple})`,
                backgroundColor:(loading||(!gh&&!lc&&!cf)) ? tk.inset : "transparent",
                color:(loading||(!gh&&!lc&&!cf)) ? tk.ink3 : "#fff",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                boxShadow:(loading||(!gh&&!lc&&!cf)) ? "none" : `0 8px 24px ${tk.blueGlow}`,
                transition:"all 0.25s ease", position:"relative", overflow:"hidden",
              }}
            >
              {!(loading||(!gh&&!lc&&!cf)) && (
                <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", animation:"shimmer 3s ease-in-out infinite" }}/>
              )}
              <span style={{ position:"relative" }}>{loading ? "Analyzing profiles…" : "⚡  Run Intelligence Analysis"}</span>
              {!loading && <span style={{ position:"relative", fontSize:18 }}>→</span>}
            </button>
          </div>

          {/* ── LOADER ── */}
          {loading && (
            <div className="fadeUp" style={{ background:tk.card, border:`1px solid ${tk.cardBorder}`, borderRadius:24, padding:"64px 40px", textAlign:"center", marginBottom:24, boxShadow:tk.shadow2 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", border:`3px solid ${tk.cardBorder2}`, borderTopColor:tk.blue, animation:"spin 0.8s linear infinite", margin:"0 auto 28px" }}/>
              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, color:tk.ink, letterSpacing:"-0.03em", marginBottom:8 }}>Fetching your data</div>
              <div style={{ fontSize:13, color:tk.ink3, marginBottom:32 }}>Querying APIs and computing your intelligence score…</div>
              <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
                {steps.map((s,i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", padding:"7px 16px", borderRadius:99, border:`1.5px solid ${stepBdr(s.status)}`, color:stepColor(s.status), background:stepBg(s.status), transition:"all 0.3s" }}>
                    {sIcon(s.status)} {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ERRORS ── */}
          {errors.length > 0 && !loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
              {errors.map((e,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderRadius:12, border:`1px solid ${tk.roseBorder}`, background:tk.roseLight, fontSize:12, fontWeight:600, color:tk.rose }}>
                  ⚠ {e}
                </div>
              ))}
            </div>
          )}

          {/* ── RESULTS ── */}
          {data && !loading && (() => {
            const rank = getRank(data.combined_score, tk);
            return (
              <>
                {/* Score Banner */}
                <div className="scalePop" style={{ background:tk.card, border:`1px solid ${tk.cardBorder}`, borderRadius:24, marginBottom:16, boxShadow:tk.shadow3, overflow:"hidden", position:"relative" }}>
                  <div style={{ height:3, backgroundImage:`linear-gradient(90deg, ${tk.blue}, ${tk.purple}, ${tk.teal})` }}/>
                  <div style={{ padding:"36px 40px", display:"grid", gridTemplateColumns:"1fr auto", gap:32, alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:tk.ink3, marginBottom:10 }}>Intelligence Report</div>
                      <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:"clamp(28px,4vw,48px)", fontWeight:700, letterSpacing:"-0.04em", color:tk.ink, marginBottom:20, lineHeight:1.05 }}>
                        {[gh,lc,cf].filter(Boolean).join("  ·  ")}
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
                        {data.github     && <span style={tagStyle(tk.blue,   tk.blueLight,   tk.blueBorder  )}>GitHub ✓</span>}
                        {data.leetcode   && <span style={tagStyle(tk.amber,  tk.amberLight,  tk.amberBorder )}>LeetCode ✓</span>}
                        {data.codeforces && <span style={tagStyle(tk.purple, tk.purpleLight, tk.purpleBorder)}>Codeforces ✓</span>}
                        <span style={tagStyle(rank.color, rank.bg, rank.border)}>{rank.emoji} {rank.label}</span>
                      </div>
                      <div style={{ padding:"16px 20px", background:tk.inset, borderRadius:12, border:`1px solid ${tk.divider}`, display:"flex", alignItems:"flex-start", gap:12 }}>
                        <span style={{ fontSize:20 }}>💬</span>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:tk.ink3, marginBottom:4 }}>Assessment</div>
                          <div style={{ fontSize:15, color:tk.ink, fontWeight:500, lineHeight:1.5 }}>{getVerdict(data.combined_score)}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:tk.ink3 }}>Overall Score</div>
                      <ScoreRing score={data.combined_score} tk={tk}/>
                      <div style={{ fontSize:11, fontWeight:700, color:rank.color, letterSpacing:"0.04em", textAlign:"center" }}>{rank.label}</div>
                    </div>
                  </div>
                </div>

                {/* Platform panels */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:14 }}>
                  <PlatformCard title="GitHub" handle={gh} accentColor={tk.blue} accentLight={tk.blueLight} accentBorder={tk.blueBorder} tk={tk} empty={!data.github?.analytics}>
                    {data.github?.analytics && (
                      <>
                        {[
                          { label:"Repositories",  value:data.github.analytics.total_projects,  accent:tk.blue  },
                          { label:"Total Stars",   value:data.github.analytics.total_stars,     accent:tk.amber },
                          { label:"Recent Active", value:data.github.analytics.recent_projects, accent:null     },
                          { label:"Skill Score",   value:`${data.github.analytics.skill_score} / 100`, accent:tk.green },
                          { label:"Top Language",  value:data.github.analytics.most_used_language || "N/A", accent:tk.blue },
                        ].map((s,i) => <StatRow key={s.label} label={s.label} value={s.value} accent={s.accent} tk={tk} stripe={i%2===1}/>)}
                        {data.github.analytics.language_distribution && Object.keys(data.github.analytics.language_distribution).length > 0 && (
                          <LangBars data={data.github.analytics.language_distribution} tk={tk}/>
                        )}
                      </>
                    )}
                  </PlatformCard>

                  <PlatformCard title="LeetCode" handle={lc} accentColor={tk.amber} accentLight={tk.amberLight} accentBorder={tk.amberBorder} tk={tk} empty={data.leetcode?.total_solved === undefined}>
                    {data.leetcode?.total_solved !== undefined && (
                      <>
                        {[
                          { label:"Total Solved",   value:data.leetcode.total_solved,            accent:tk.amber  },
                          { label:"Global Rank",    value:data.leetcode.ranking ? `#${data.leetcode.ranking.toLocaleString()}` : "N/A", accent:null },
                          { label:"Contest Rating", value:data.leetcode.contest_rating || "N/A", accent:tk.purple },
                          { label:"Contests",       value:data.leetcode.contests_attended,        accent:null      },
                          { label:"Top %",          value:data.leetcode.top_percentage ? `${data.leetcode.top_percentage}%` : "N/A", accent:tk.green },
                        ].map((s,i) => <StatRow key={s.label} label={s.label} value={s.value} accent={s.accent} tk={tk} stripe={i%2===1}/>)}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, padding:"14px 14px 16px" }}>
                          {([
                            { n:data.leetcode.easy_solved,   l:"Easy", c:tk.green,  bg:tk.greenLight,  bdr:tk.greenBorder  },
                            { n:data.leetcode.medium_solved, l:"Med",  c:tk.amber,  bg:tk.amberLight,  bdr:tk.amberBorder  },
                            { n:data.leetcode.hard_solved,   l:"Hard", c:tk.rose,   bg:tk.roseLight,   bdr:tk.roseBorder   },
                          ] as const).map(d => (
                            <div key={d.l} style={{ borderRadius:12, padding:"14px 8px", textAlign:"center", border:`1.5px solid ${d.bdr}`, background:d.bg }}>
                              <div style={{ fontFamily:"'Clash Display',sans-serif", fontSize:26, fontWeight:700, lineHeight:1, color:d.c, letterSpacing:"-0.03em" }}>{d.n}</div>
                              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:d.c, marginTop:5, opacity:0.8 }}>{d.l}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </PlatformCard>

                  <PlatformCard title="Codeforces" handle={cf} accentColor={tk.purple} accentLight={tk.purpleLight} accentBorder={tk.purpleBorder} tk={tk} empty={data.codeforces?.rating === undefined}>
                    {data.codeforces?.rating !== undefined && (
                      <>
                        {[
                          { label:"Current Rating",  value:data.codeforces.rating,                accent:tk.purple },
                          { label:"Peak Rating",     value:data.codeforces.max_rating,            accent:tk.blue   },
                          { label:"Rank",            value:data.codeforces.rank||"unrated",       accent:cfColor(data.codeforces.rank,tk) },
                          { label:"Peak Rank",       value:data.codeforces.max_rank||"unrated",   accent:cfColor(data.codeforces.max_rank,tk) },
                          { label:"Problems Solved", value:data.codeforces.problems_solved,       accent:tk.green  },
                          { label:"Contests",        value:data.codeforces.contests_participated, accent:null      },
                          { label:"Contribution",    value:data.codeforces.contribution,          accent:(data.codeforces.contribution ?? 0) >= 0 ? tk.green : tk.rose },
                        ].map((s,i) => <StatRow key={s.label} label={s.label} value={s.value} accent={s.accent} tk={tk} stripe={i%2===1}/>)}
                      </>
                    )}
                  </PlatformCard>
                </div>

                {/* Repos */}
                {data.github?.repositories && data.github.repositories.length > 0 && (
                  <div className="scalePop scalePop1" style={{ background:tk.card, border:`1px solid ${tk.cardBorder}`, borderRadius:20, overflow:"hidden", boxShadow:tk.shadow2, marginBottom:16 }}>
                    <div style={{ padding:"16px 24px", borderBottom:`1px solid ${tk.divider}`, background:tk.inset, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:tk.blueLight, border:`1px solid ${tk.blueBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>📁</div>
                        <span style={{ fontFamily:"'Clash Display',sans-serif", fontSize:15, fontWeight:700, color:tk.ink, letterSpacing:"-0.02em" }}>Repositories</span>
                      </div>
                      <span style={{ fontSize:11, color:tk.ink3, fontWeight:600, padding:"3px 10px", borderRadius:99, background:tk.pillBg, border:`1px solid ${tk.cardBorder}` }}>{data.github.repositories.length} projects</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))" }}>
                      {data.github.repositories.map((r,i) => <RepoCard key={i} repo={r} tk={tk}/>)}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{ padding:"18px 0", borderTop:`1px solid ${tk.divider}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:tk.ink3, fontWeight:600 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:20, height:20, borderRadius:5, backgroundImage:`linear-gradient(135deg,${tk.blue},${tk.purple})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontFamily:"'Clash Display',sans-serif", fontSize:10, fontWeight:700, color:"#fff" }}>D</span>
                    </div>
                    DevIQ — Developer Intelligence Engine
                  </div>
                  <span>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}