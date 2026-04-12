import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, Request, Response, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore, auth
from github import fetch_github_data
from analytics import calculate_skill_score
import json
from pathlib import Path

# Initialize Firebase
firebase_key_path = Path("firebase-key.json")
if firebase_key_path.exists():
    cred = credentials.Certificate(str(firebase_key_path))
    firebase_admin.initialize_app(cred)
    db = firestore.client()
else:
    print("⚠️  firebase-key.json not found. Please set it up.")
    print("See FIREBASE_SETUP.md for instructions.")
    db = None

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


# Helper to verify Firebase token
async def verify_firebase_token(authorization: Optional[str] = Header(None)) -> str:
    """Verify Firebase ID token and return user ID"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing authorization header")
    
    token = authorization.replace("Bearer ", "")
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token['uid']
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")


@app.get("/")
def home():
    return {"message": "Developer Portfolio Intelligence API Running"}


class OAuthUserData(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    profile_picture_url: Optional[str] = None
    provider: Optional[str] = "google"
    user: Optional[Dict[str, Any]] = None


class ConnectAccountBody(BaseModel):
    username: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    prompt: str
    conversation_history: Optional[list] = None


@app.post("/ai/insights")
async def ai_insights(
    body: ChatRequest = Body(...),
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """Generate AI insights using Groq API"""
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        raise HTTPException(500, "Groq API key not configured")
    
    try:
        client = Groq(api_key=groq_api_key)
        
        # Prepare messages for Groq API
        messages = [
            {
                "role": "system",
                "content": "You are a helpful AI assistant for developers. You help them understand their coding profiles, analyze their skills, and provide insights about their progress. Be concise, encouraging, and practical in your responses."
            },
            {
                "role": "user",
                "content": body.prompt
            }
        ]
        
        # Call Groq API with llama-3-8b (fast, free model)
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # Fast and available
            messages=messages,
            temperature=0.7,
            max_tokens=500,
        )
        
        result = completion.choices[0].message.content
        return {
            "result": result,
            "status": "success"
        }
    
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


def _uid_from_email(email: str) -> str:
    return email.strip().lower().replace("@", "_").replace(".", "_")


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def resolve_uid(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
) -> str:
    """
    Resolve user identity from Firebase token when available.
    Falls back to x-user-email for local/dev flows where no token is stored.
    """
    if authorization and authorization.startswith("Bearer "):
        return await verify_firebase_token(authorization)

    if x_user_email and x_user_email.strip():
        return _uid_from_email(x_user_email)

    raise HTTPException(401, "Missing authorization")


@app.post("/auth/oauth")
async def oauth_login(data: OAuthUserData):
    """Register/login an OAuth user (Google or GitHub)"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    # Extract user data from request - handle both flat and nested structures
    name = data.name
    email = data.email
    avatar = data.avatar or data.profile_picture_url
    provider = data.provider or "google"
    
    # Check nested user object if top-level fields are missing
    if data.user and isinstance(data.user, dict):
        name = name or data.user.get("name")
        email = email or data.user.get("email")
        avatar = avatar or data.user.get("picture")
    
    print("OAuth request received")
    print(f"Parsed payload: name={name}, email={email}, provider={provider}")
    
    if not email:
        print("OAuth request missing email")
        raise HTTPException(400, "Email is required")

    # Fallback name so OAuth can still succeed when providers omit display name.
    if not name:
        name = email.split("@")[0]
    
    try:
        # Use deterministic UID from email and upsert in one path.
        uid = email.strip().lower().replace("@", "_").replace(".", "_")
        user_ref = db.collection("users").document(uid)

        existing_doc = user_ref.get()
        payload = {
            "name": name,
            "email": email,
            "avatar": avatar,
            "provider": provider,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        if not existing_doc.exists:
            payload["createdAt"] = firestore.SERVER_TIMESTAMP

        user_ref.set(payload, merge=True)
        print(f"OAuth profile synced for {email} as uid={uid}")

        # Retrieve and return user data
        user_doc = db.collection("users").document(uid).get()

        if not user_doc.exists:
            print("OAuth profile write verification failed")
            raise HTTPException(500, "Could not verify user was created")

        user_data = user_doc.to_dict()
        print("OAuth endpoint completed successfully")
        
        return {
            "user": user_data,
            "uid": uid,
            "message": "OAuth user synced successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print("Unexpected error in OAuth login")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(500, f"OAuth sync failed: {str(e)}")


@app.get("/analyze/{username}")
def analyze(username: str):
    repos = fetch_github_data(username)
    analytics = calculate_skill_score(repos)

    return {
        "username": username,
        "analytics": analytics,
        "repositories": repos
    }

@app.get("/leetcode/{username}")
def leetcode_analyze(username: str):
    """Fetch LeetCode profile data for a user"""
    # Placeholder: return mock LeetCode data
    # In production, this would fetch from LeetCode API
    return {
        "username": username,
        "total_solved": 150,
        "easy_solved": 80,
        "medium_solved": 50,
        "hard_solved": 20,
        "acceptance_rate": 65.5,
        "ranking": 25000,
        "reputation": 45
    }

@app.get("/codeforces/{username}")
def codeforces_analyze(username: str):
    """Fetch Codeforces profile data for a user"""
    # Placeholder: return mock Codeforces data
    # In production, this would fetch from Codeforces API
    return {
        "username": username,
        "rating": 1400,
        "max_rating": 1500,
        "rank": "Expert",
        "max_rank": "Expert",
        "problems_solved": 250,
        "contest_count": 20
    }


# ─────────────────────────────────────────────────
# Firebase Authentication endpoints
# ─────────────────────────────────────────────────

@app.get("/auth/me")
async def me(authorization: Optional[str] = Header(None)):
    """Get current authenticated user profile"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await verify_firebase_token(authorization)
    user_doc = db.collection("users").document(uid).get()
    
    if not user_doc.exists:
        raise HTTPException(404, "User profile not found")
    
    return user_doc.to_dict()

@app.post("/auth/logout")
def logout():
    """Logout (client-side token deletion)"""
    return {"ok": True}

@app.delete("/auth/account")
async def delete_account(authorization: Optional[str] = Header(None)):
    """Delete authenticated user account"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await verify_firebase_token(authorization)
    
    # Delete user profile from Firestore
    db.collection("users").document(uid).delete()
    
    # Delete user from Firebase Auth
    try:
        auth.delete_user(uid)
    except Exception as e:
        print(f"Warning: Could not delete auth user: {e}")
    
    return {"ok": True}

@app.get("/profile")
async def get_profile(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """Get user's portfolio profile data"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await resolve_uid(authorization, x_user_email)
    user_doc = db.collection("users").document(uid).get()
    
    if not user_doc.exists:
        return {"profile": {}}
    
    return user_doc.to_dict().get("profile", {})

@app.put("/profile")
async def set_profile(
    data: dict,
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """Update user's portfolio profile data"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await resolve_uid(authorization, x_user_email)
    
    # Update profile in Firestore
    db.collection("users").document(uid).update({
        "profile": data,
        "updatedAt": firestore.SERVER_TIMESTAMP
    })
    
    return data

@app.post("/sync/profile")
async def sync_profile(
    data: dict = Body(...),
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """Sync user profile data to backend (supports token or email fallback)"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await resolve_uid(authorization, x_user_email)
    
    # Update profile in Firestore with merge to preserve existing data
    db.collection("users").document(uid).set({
        "profile": data,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    # Return updated profile (same data that was sent)
    return {
        "message": "Profile synced successfully",
        "user": data
    }

@app.post("/profile/picture")
async def save_profile_picture(
    body: Dict[str, Any] = Body(...),
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    """Save user's profile picture URL"""
    if not db:
        raise HTTPException(500, "Firebase not configured")
    
    uid = await resolve_uid(authorization, x_user_email)
    picture_url = body.get("picture_url", "")
    
    # Update profile picture in Firestore with merge to preserve existing data
    db.collection("users").document(uid).set({
        "profile": {
            "profile_picture_url": picture_url,
            "avatar": picture_url,  # Store in both places for compatibility
        },
        "updatedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)
    
    return {
        "message": "Profile picture saved",
        "picture_url": picture_url
    }


# ─────────────────────────────────────────────────
# Connected Accounts endpoints
# ─────────────────────────────────────────────────

@app.get("/accounts/connected")
async def get_connected_accounts(
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    if not db:
        raise HTTPException(500, "Firebase not configured")

    uid = await resolve_uid(authorization, x_user_email)
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return {"accounts": []}

    user_data = user_doc.to_dict() or {}
    connected_map = user_data.get("connected_accounts", {})
    if not isinstance(connected_map, dict):
        return {"accounts": []}

    accounts = []
    for platform, value in connected_map.items():
        if isinstance(value, dict):
            accounts.append({
                "platform": value.get("platform", platform),
                "platform_username": value.get("platform_username", ""),
                "is_active": bool(value.get("is_active", False)),
                "connected_at": value.get("connected_at", ""),
                "last_synced_at": value.get("last_synced_at", ""),
            })

    return {"accounts": accounts}


@app.post("/accounts/connect/{platform}")
async def connect_account(
    platform: str,
    body: ConnectAccountBody,
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    if not db:
        raise HTTPException(500, "Firebase not configured")

    normalized_platform = platform.strip().lower()
    if normalized_platform not in {"github", "leetcode", "codeforces"}:
        raise HTTPException(400, "Unsupported platform")

    uid = await resolve_uid(authorization, x_user_email)

    username = (body.username or "").strip()
    if not username and isinstance(body.metadata, dict):
        username = (
            str(body.metadata.get("username") or "").strip()
            or str(body.metadata.get("login") or "").strip()
            or str(body.metadata.get("name") or "").strip()
        )

    if not username:
        raise HTTPException(400, "Username is required")

    now = _iso_now()
    
    # Get current user document
    user_doc = db.collection("users").document(uid).get()
    current_accounts = {}
    if user_doc.exists:
        current_accounts = user_doc.to_dict().get("connected_accounts", {}) or {}
    
    # Update the specific platform account
    current_accounts[normalized_platform] = {
        "platform": normalized_platform,
        "platform_username": username,
        "is_active": True,
        "connected_at": now,
        "last_synced_at": now,
    }
    
    # Save properly nested structure
    db.collection("users").document(uid).set({
        "connected_accounts": current_accounts,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)

    return {
        "ok": True,
        "platform": normalized_platform,
        "platform_username": username,
    }


@app.delete("/accounts/disconnect/{platform}")
async def disconnect_account(
    platform: str,
    authorization: Optional[str] = Header(None),
    x_user_email: Optional[str] = Header(None),
):
    if not db:
        raise HTTPException(500, "Firebase not configured")

    normalized_platform = platform.strip().lower()
    if normalized_platform not in {"github", "leetcode", "codeforces"}:
        raise HTTPException(400, "Unsupported platform")

    uid = await resolve_uid(authorization, x_user_email)
    now = _iso_now()
    
    # Get current user document
    user_doc = db.collection("users").document(uid).get()
    current_accounts = {}
    if user_doc.exists:
        current_accounts = user_doc.to_dict().get("connected_accounts", {}) or {}
    
    # Mark the platform account as inactive
    if normalized_platform in current_accounts:
        current_accounts[normalized_platform]["is_active"] = False
        current_accounts[normalized_platform]["last_synced_at"] = now
    
    # Save properly nested structure
    db.collection("users").document(uid).set({
        "connected_accounts": current_accounts,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }, merge=True)

    return {"ok": True, "platform": normalized_platform}

