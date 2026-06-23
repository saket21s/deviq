import requests
from typing import Dict, Any, Optional, List

CF_API = "https://codeforces.com/api"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


def _problem_url(problem: Dict[str, Any]) -> str:
    """Build a stable, publicly accessible URL for a Codeforces problem.

    The /problemset/ archive view works for any problem without contest
    registration, unlike /contest/{id}/... which redirects to the homepage
    when the viewer is not registered for the contest.
    """
    contest_id = problem.get("contestId")
    index = problem.get("index")
    if (problem.get("problemsetName") or "").lower() == "acmsguru":
        return f"https://codeforces.com/problemsets/acmsguru/problem/99999/{index}"
    if isinstance(contest_id, int) and contest_id >= 100000:
        return f"https://codeforces.com/gym/{contest_id}/problem/{index}"
    return f"https://codeforces.com/problemset/problem/{contest_id}/{index}"


def _get(endpoint: str, params: Dict[str, Any]) -> Optional[Any]:
    """Call a Codeforces API endpoint and return its `result` payload."""
    resp = requests.get(
        f"{CF_API}/{endpoint}", params=params, headers=_HEADERS, timeout=20
    )
    if resp.status_code != 200:
        return None
    payload = resp.json()
    if payload.get("status") != "OK":
        return None
    return payload.get("result")


def fetch_codeforces_data(handle: str) -> Optional[Dict[str, Any]]:
    """Fetch real Codeforces profile data for a handle.

    Returns a dict matching the frontend `CodeforcesData` shape (plus a
    ``recent_solved`` list), or ``None`` when the handle does not exist.
    """
    handle = (handle or "").strip()
    if not handle:
        return None

    # 1. Basic profile info (rating, rank, contribution).
    try:
        info = _get("user.info", {"handles": handle})
    except Exception as e:
        print(f"Error fetching Codeforces info for {handle}: {e}")
        return None

    if not info:
        return None  # Unknown handle.

    user = info[0]
    result: Dict[str, Any] = {
        "username": user.get("handle", handle),
        "rating": user.get("rating", 0),
        "max_rating": user.get("maxRating", 0),
        "rank": user.get("rank", "unrated"),
        "max_rank": user.get("maxRank", "unrated"),
        "contribution": user.get("contribution", 0),
    }

    # 2. Contests participated (rating-changes history).
    try:
        rating_history = _get("user.rating", {"handle": handle})
        result["contests_participated"] = (
            len(rating_history) if isinstance(rating_history, list) else 0
        )
    except Exception as e:
        print(f"Error fetching Codeforces rating history for {handle}: {e}")
        result["contests_participated"] = 0

    # 3. Submissions → solved-problem count + recent solved list.
    try:
        submissions = _get("user.status", {"handle": handle, "from": 1, "count": 5000})
        solved_keys = set()
        recent_solved: List[Dict[str, Any]] = []
        recent_seen = set()
        for sub in submissions or []:
            if sub.get("verdict") != "OK":
                continue
            problem = sub.get("problem") or {}
            contest_id = problem.get("contestId")
            index = problem.get("index")
            if contest_id is None or index is None:
                continue
            key = f"{contest_id}-{index}"
            if key in solved_keys:
                continue
            solved_keys.add(key)
            # Submissions come newest-first, so the first time we see a
            # problem is its most recent accepted submission.
            if key not in recent_seen and len(recent_solved) < 50:
                recent_seen.add(key)
                recent_solved.append({
                    "name": problem.get("name", key),
                    "url": _problem_url(problem),
                    "rating": problem.get("rating"),
                    "timestamp": sub.get("creationTimeSeconds"),
                })
        result["problems_solved"] = len(solved_keys)
        result["recent_solved"] = recent_solved
    except Exception as e:
        print(f"Error fetching Codeforces submissions for {handle}: {e}")
        result["problems_solved"] = 0
        result["recent_solved"] = []

    return result
