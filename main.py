import os
from fastapi import FastAPI, Request, Response, HTTPException, Cookie
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from uuid import uuid4
import hashlib
from github import fetch_github_data
from analytics import calculate_skill_score

# simple in-memory user/session store for demonstration
# in a real application this would be replaced by a database
users: dict[str, dict] = {}
sessions: dict[str, str] = {}  # token -> email

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

app = FastAPI()


# allow_origins cannot be '*' when credentials=True; specify the
# frontend origin(s) explicitly.  You can set FRONTEND_ORIGINS to a
# comma-separated list of allowed origins (e.g. http://localhost:3000).
front = os.environ.get("FRONTEND_ORIGINS", "http://localhost:3000")
allow_list = [o.strip() for o in front.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Developer Portfolio Intelligence API Running"}

@app.get("/analyze/{username}")
def analyze(username: str):
    repos = fetch_github_data(username)
    analytics = calculate_skill_score(repos)

    return {
        "username": username,
        "analytics": analytics,
        "repositories": repos
    }


# ─────────────────────────────────────────────────
# Authentication / user storage endpoints
# ─────────────────────────────────────────────────

@app.post("/auth/signup")
def signup(data: dict, response: Response):
    email = (data.get("email") or "").lower()
    password = data.get("password")
    name = data.get("name") or ""
    avatar = data.get("avatar")
    provider = "email"
    if not email or not password:
        raise HTTPException(400, "Missing email or password")
    if email in users:
        raise HTTPException(400, "Email already registered")
    users[email] = {
        "name": name,
        "email": email,
        "password": hash_pw(password),
        "avatar": avatar,
        "provider": provider,
        "profile": {}
    }
    token = str(uuid4())
    sessions[token] = email
    response.set_cookie(key="session", value=token, httponly=True)
    return users[email]

@app.post("/auth/login")
def login(data: dict, response: Response):
    email = (data.get("email") or "").lower()
    password = data.get("password")
    if not email or not password:
        raise HTTPException(400, "Missing email or password")
    user = users.get(email)
    if not user or user.get("password") != hash_pw(password):
        raise HTTPException(400, "Invalid credentials")
    token = str(uuid4())
    sessions[token] = email
    response.set_cookie(key="session", value=token, httponly=True, samesite="none", secure=True)
    return user

@app.post("/auth/oauth")
def oauth(data: dict, response: Response):
    email = (data.get("email") or "").lower()
    name = data.get("name") or ""
    avatar = data.get("avatar")
    provider = data.get("provider") or "google"
    if not email:
        raise HTTPException(400, "Missing email")
    user = users.get(email)
    if user:
        # update existing
        user["name"] = name or user.get("name")
        user["avatar"] = avatar or user.get("avatar")
        user["provider"] = provider
    else:
        users[email] = {
            "name": name,
            "email": email,
            "password": None,
            "avatar": avatar,
            "provider": provider,
            "profile": {}
        }
    token = str(uuid4())
    sessions[token] = email
    response.set_cookie(key="session", value=token, httponly=True, samesite="none", secure=True)
    return users[email]

@app.get("/auth/me")
def me(session: Optional[str] = Cookie(None)):
    if not session or session not in sessions:
        raise HTTPException(401, "Not logged in")
    email = sessions[session]
    return users[email]

@app.post("/auth/logout")
def logout(response: Response, session: Optional[str] = Cookie(None)):
    if session and session in sessions:
        sessions.pop(session, None)
    response.delete_cookie("session")
    return {"ok": True}

@app.delete("/auth/account")
def delete_account(response: Response, session: Optional[str] = Cookie(None)):
    if not session or session not in sessions:
        raise HTTPException(401, "Not logged in")
    email = sessions.pop(session)
    response.delete_cookie("session")
    users.pop(email, None)
    return {"ok": True}

@app.get("/profile")
def get_profile(session: Optional[str] = Cookie(None)):
    if not session or session not in sessions:
        raise HTTPException(401, "Not logged in")
    email = sessions[session]
    return users[email].get("profile", {})

@app.put("/profile")
def set_profile(data: dict, session: Optional[str] = Cookie(None)):
    if not session or session not in sessions:
        raise HTTPException(401, "Not logged in")
    email = sessions[session]
    users[email].setdefault("profile", {}).update(data)
    return users[email]["profile"]
