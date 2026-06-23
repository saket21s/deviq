import { NextRequest, NextResponse } from "next/server";

const GQL = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured on server" }, { status: 500 });
  }

  try {
    const r = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "DevIQ/1.0",
      },
      body: JSON.stringify({ query: GQL, variables: { login: username } }),
    });

    if (!r.ok) {
      return NextResponse.json({ error: `GitHub API ${r.status}` }, { status: r.status });
    }

    const b = await r.json();
    if (b.errors?.length) {
      return NextResponse.json({ error: b.errors[0].message }, { status: 400 });
    }
    if (!b.data?.user) {
      return NextResponse.json({ error: `User "${username}" not found` }, { status: 404 });
    }

    const cal = b.data.user.contributionsCollection.contributionCalendar;
    const contributions: { date: string; count: number; level: number }[] = [];
    const LEVEL_MAP: Record<string, number> = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

    for (const w of cal.weeks) {
      for (const d of w.contributionDays) {
        contributions.push({ date: d.date, count: d.contributionCount, level: LEVEL_MAP[d.contributionLevel] ?? 0 });
      }
    }
    contributions.sort((a, b) => a.date.localeCompare(b.date));

    let longest = 0, temp = 0;
    for (const d of contributions) {
      if (d.count > 0) { temp++; longest = Math.max(longest, temp); } else temp = 0;
    }

    const today = new Date().toISOString().split("T")[0];
    const days = contributions.at(-1)?.date === today && contributions.at(-1)?.count === 0
      ? contributions.slice(0, -1) : contributions;
    let current = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) current++; else break;
    }

    return NextResponse.json({
      contributions,
      total_last_year: cal.totalContributions,
      current_streak: current,
      longest_streak: longest,
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Server error: ${e instanceof Error ? e.message : String(e)}` },
      { status: 502 },
    );
  }
}
