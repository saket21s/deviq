# Developer Portfolio System

This repository contains the frontend (Next.js/React) and a simple FastAPI backend used
by the developer portfolio system. The frontend used to store everything in
`localStorage`, which meant that user accounts and preferences were only available
on the current device. To provide globally persistent profiles (GitHub/Google
sign‑in and avatar/profile data), a backend service now persists user records and
sessions.

## Running the backend

Make sure you have Python 3.9+ installed.

```bash
# create a virtual environment if you like
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn[standard] python-multipart

# start the server
uvicorn main:app --reload --port 8000
```

The server will listen on http://localhost:8000 and expose the following routes:

* `POST /auth/signup` – create a new account with email/password
* `POST /auth/login` – log in with email/password
* `POST /auth/oauth` – register/login an OAuth user (name, email, avatar, provider)
* `GET /auth/me` – return the current user based on the session cookie
* `POST /auth/logout` – clear session
* `DELETE /auth/account` – delete the authenticated account
* `GET /profile` – return the profile object for the logged‑in user
* `PUT /profile` – update profile fields

The implementation is purely in‑memory. For production you would replace the
dictionaries with a real database.

CORS is configured to allow credentials so that the frontend can authenticate
via cookies.

## Configuring the frontend

The frontend application (`app/page.tsx`) communicates with the backend.
For convenience during development, the client automatically defaults to
`http://localhost:8000` when the page is being served from `localhost`.
This means you can start the Python server locally and the pages will talk
there without needing to set any environment variables.  If you prefer to
hit the deployed service, set `NEXT_PUBLIC_API_BASE_URL` to the desired
URL (e.g. `https://developer-portfolio-backend-bu76.onrender.com`).

If the remote API responds with 404/CORS failures the client will even try
a second request against `http://localhost:8000` before giving up – this
makes it easy to keep working even if the public deployment is out of date.

Production builds should always explicitly configure `NEXT_PUBLIC_API_BASE_URL`
and ensure the backend has been deployed with the updated code and the
appropriate `FRONTEND_ORIGINS` environment variable set.

Install dependencies and run the frontend as usual with Next.js.

```bash
cd frontend
npm install
npm run dev
```

## What changed

* All authentication state is now persisted on the backend instead of
  `localStorage`.
* The OAuth login flow (`Google`/`GitHub`) registers users on the server and,
  when they sign in from another device, the same profile (including avatar)
  will be returned by the server.
* New API helpers (`apiLogin`, `apiSignup`, `apiOAuth`, `apiFetchSession`, etc.)
  were added to the frontend and used by the auth UI.
* Fallback to `localStorage` remains for offline scenarios.

After logging in (email or OAuth) you should now see your profile picture in
place of the placeholder, and if you log in from a different browser/device the
same data will be loaded from the server.

---

This is a minimal demo; in a real application you'd secure passwords,
implement rate‑limiting, store data persistently, and use HTTPS.
