"use client";
import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["","Mon","","Wed","","Fri",""];

interface Contribution { date: string; count: number; level: number; }
interface HeatmapData {
  contributions: Contribution[];
  total_last_year: number;
  current_streak: number;
  longest_streak: number;
  busiest_day?: { date: string; count: number };
  error?: string;
}
interface HeatmapTheme {
  card: string; inset: string; cardBorder: string; cardBorder2: string; divider: string;
  ink: string; ink2: string; ink3: string;
  green: string; greenLight: string; greenBorder: string;
  blue: string; purple: string; rose: string;
  shadow2: string;
  heatL0: string; heatL1: string; heatL2: string; heatL3: string; heatL4: string;
}

/* ═══════════════════════════════════════════════════
   GITHUB GRAPHQL FETCH (frontend, no backend needed)
═══════════════════════════════════════════════════ */
const LEVEL_MAP: Record<string, number> = {
  NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4,
};

const GQL_QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

async function fetchContributionsFromGitHub(
  username: string,
  token: string
): Promise<HeatmapData> {
  const resp = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "DevIQ/1.0",
    },
    body: JSON.stringify({ query: GQL_QUERY, variables: { login: username } }),
  });

  if (!resp.ok) throw new Error(`GitHub API HTTP ${resp.status}`);

  const body = await resp.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  if (!body.data?.user) throw new Error(`User "${username}" not found`);

  const calendar =
    body.data.user.contributionsCollection.contributionCalendar;

  const contributions: Contribution[] = [];
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributions.push({
        date:  day.date,
        count: day.contributionCount,
        level: LEVEL_MAP[day.contributionLevel] ?? 0,
      });
    }
  }
  contributions.sort((a, b) => a.date.localeCompare(b.date));

  // Longest streak
  let longest_streak = 0, temp = 0;
  for (const d of contributions) {
    if (d.count > 0) { temp++; longest_streak = Math.max(longest_streak, temp); }
    else temp = 0;
  }

  // Current streak — don't penalise a partial in-progress today
  const todayStr = new Date().toISOString().split("T")[0];
  const streakDays =
    contributions.at(-1)?.date === todayStr && contributions.at(-1)?.count === 0
      ? contributions.slice(0, -1)
      : contributions;

  let current_streak = 0;
  for (let i = streakDays.length - 1; i >= 0; i--) {
    if (streakDays[i].count > 0) current_streak++;
    else break;
  }

  const busiest_day = contributions.reduce(
    (best, d) => (d.count > (best?.count ?? 0) ? d : best),
    contributions[0]
  );

  return {
    contributions,
    total_last_year: calendar.totalContributions,
    current_streak,
    longest_streak,
    busiest_day,
  };
}

/* ═══════════════════════════════════════════════════
   GRID BUILDER
═══════════════════════════════════════════════════ */
function buildGrid(contributions: Contribution[]) {
  const map: Record<string, Contribution> = {};
  contributions.forEach(c => { map[c.date] = c; });

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay()); // align to Sunday

  const weeks: (Contribution | null)[][] = [];
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  const cursor = new Date(start);

  for (let w = 0; w < 53; w++) {
    const week: (Contribution | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = cursor.toISOString().split("T")[0];
      if (d === 0) {
        const m = cursor.getMonth();
        if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: w }); lastMonth = m; }
      }
      week.push(cursor <= today ? (map[dateStr] || { date: dateStr, count: 0, level: 0 }) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return { weeks, monthLabels };
}

/* ═══════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════ */
export default function Contributionheatmap({
  username,
  tk,
  githubToken,
}: {
  username: string;
  tk: HeatmapTheme;
  /** Pass process.env.NEXT_PUBLIC_GITHUB_TOKEN or a user-supplied PAT */
  githubToken?: string;
}) {
  const [hdata,   setHdata]   = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    if (!username) return;

    const token = githubToken || process.env.NEXT_PUBLIC_GITHUB_TOKEN || "";
    if (!token) {
      setHdata({ contributions: [], total_last_year: 0, current_streak: 0, longest_streak: 0, error: "No GitHub token provided. Set NEXT_PUBLIC_GITHUB_TOKEN or pass githubToken prop." });
      return;
    }

    setLoading(true);
    setHdata(null);

    fetchContributionsFromGitHub(username, token)
      .then(d => { setHdata(d); setLoading(false); })
      .catch(e => { setHdata({ contributions: [], total_last_year: 0, current_streak: 0, longest_streak: 0, error: String(e) }); setLoading(false); });
  }, [username, githubToken]);

  const CELL = 12, GAP = 3, TOTAL = CELL + GAP;
  const levelColor = (l: number) =>
    ([tk.heatL0, tk.heatL1, tk.heatL2, tk.heatL3, tk.heatL4] as const)[l] ?? tk.heatL0;

  const { weeks, monthLabels } =
    hdata?.contributions?.length
      ? buildGrid(hdata.contributions)
      : { weeks: [], monthLabels: [] };

  return (
    <div
      className="scalePop scalePop1"
      style={{ background: tk.card, border: `1px solid ${tk.cardBorder}`, borderRadius: 18, overflow: "hidden", boxShadow: tk.shadow2, marginBottom: 12 }}
    >
      {/* ── Header ── */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${tk.divider}`, background: tk.inset, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: tk.greenLight, border: `1px solid ${tk.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🌿</div>
          <div>
            <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 700, color: tk.ink, letterSpacing: "-0.02em" }}>Contribution Activity</span>
            <div style={{ fontSize: 10, color: tk.ink3, marginTop: 1 }}>Last 12 months · @{username}</div>
          </div>
        </div>

        {hdata && !hdata.error && (
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {([
              { val: hdata.total_last_year ?? 0,      label: "Contributions",  color: tk.green  },
              { val: `${hdata.current_streak ?? 0}d`, label: "Current Streak", color: tk.blue   },
              { val: `${hdata.longest_streak ?? 0}d`, label: "Longest Streak", color: tk.purple },
            ] as const).map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 700, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: tk.ink3, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "20px 20px 16px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "32px 0", color: tk.ink3, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em" }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${tk.cardBorder2}`, borderTopColor: tk.green, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }}/>
            Loading contributions…
          </div>
        )}

        {/* Error */}
        {hdata?.error && (
          <div style={{ textAlign: "center", padding: "24px 16px", color: tk.rose, fontSize: 12, fontWeight: 600 }}>
            ⚠ {hdata.error}
          </div>
        )}

        {/* No token helper */}
        {!githubToken && !process.env.NEXT_PUBLIC_GITHUB_TOKEN && !loading && !hdata && (
          <div style={{ textAlign: "center", padding: "24px 16px", color: tk.ink3, fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🔑</div>
            <strong style={{ color: tk.ink }}>GitHub token required</strong><br/>
            Set <code style={{ background: tk.inset, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>NEXT_PUBLIC_GITHUB_TOKEN</code> in your <code style={{ background: tk.inset, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>.env.local</code>
            <br/>
            <span style={{ fontSize: 11, marginTop: 4, display: "block" }}>Only <strong>read:user</strong> scope needed — no write access.</span>
          </div>
        )}

        {/* Grid */}
        {weeks.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "inline-block", minWidth: weeks.length * TOTAL + 32 }}>

              {/* Month labels */}
              <div style={{ display: "flex", marginLeft: 28, marginBottom: 4, position: "relative", height: 14 }}>
                {monthLabels.map((m, i) => (
                  <div key={i} style={{ position: "absolute", left: m.col * TOTAL, fontSize: 10, color: tk.ink3, fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 0 }}>
                {/* Day labels */}
                <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 6 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} style={{ height: CELL, fontSize: 9, color: tk.ink3, fontWeight: 600, display: "flex", alignItems: "center" }}>{d}</div>
                  ))}
                </div>

                {/* Cells */}
                <div style={{ display: "flex", gap: GAP }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP }}>
                      {week.map((day, di) => (
                        <div
                          key={di}
                          style={{ width: CELL, height: CELL, borderRadius: 2, background: day ? levelColor(day.level) : "transparent", cursor: day ? "pointer" : "default", transition: "transform 0.1s, filter 0.1s" }}
                          onMouseEnter={e => {
                            if (!day) return;
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, text: `${day.count} contribution${day.count !== 1 ? "s" : ""} · ${day.date}` });
                            (e.currentTarget as HTMLElement).style.transform = "scale(1.5)";
                            (e.currentTarget as HTMLElement).style.filter = "brightness(1.2)";
                          }}
                          onMouseLeave={e => {
                            setTooltip(null);
                            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                            (e.currentTarget as HTMLElement).style.filter = "brightness(1)";
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, justifyContent: "flex-end" }}>
                <span style={{ fontSize: 10, color: tk.ink3, fontWeight: 500, marginRight: 2 }}>Less</span>
                {([0, 1, 2, 3, 4] as const).map(l => (
                  <div key={l} style={{ width: CELL, height: CELL, borderRadius: 2, background: levelColor(l) }}/>
                ))}
                <span style={{ fontSize: 10, color: tk.ink3, fontWeight: 500, marginLeft: 2 }}>More</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translate(-50%,-100%)", background: tk.card, border: `1px solid ${tk.cardBorder}`, borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 600, color: tk.ink, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap", boxShadow: tk.shadow2 }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}