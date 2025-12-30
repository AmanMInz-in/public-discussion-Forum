# Discussion Forum (open source demo)

This repository is open source and released under the MIT license. All threads are public by design.

This repo contains two modes:
- Static/demo mode: records threads in the browser's `localStorage` (private to that browser instance).
- Server mode: a simple Node/Express backend (included) persists threads to a file and makes them publicly available when you deploy the server.

How to run (static/demo)
- Open [index.html](index.html) in your browser.
- Or serve the folder with a static server (e.g. `npx http-server` or VS Code Live Server).

How to run (server — makes threads publicly available)
1. Install Node.js (v14+ recommended)
2. In this folder, install dependencies and start the server:

```powershell
cd g:/Projects/discussion
npm install
npm start
```

3. Open http://localhost:3000 — the site will use the backend API to store threads and replies in `data/threads.json`.

Notes and safety
- The provided server is intentionally minimal and has no authentication. All threads and replies are public and can be read or written by anyone who can access the server. Do not deploy the server with real user data unless you add authentication, moderation and abuse protection.
- If you only want a local prototype, use the static mode (open `index.html`) which keeps data in your browser.

Moderation API
- Approve a thread: `POST /api/threads/:id/approve` — sets an `approved` flag on a thread.
- Delete a thread: `DELETE /api/threads/:id` — removes the thread from storage.

Note: the moderation endpoints are intentionally unauthenticated in this demo. Add authentication and access controls before using in production.

Authentication / login (demo)
- The demo requires a simple email sign-in in the header UI. This is not a secure authentication system — it only stores the provided email locally in your browser (`localStorage`) and is intended for demo/identity display purposes only.
- When using the server mode, the client includes the displayed name (email local-part) as the `author` for new threads and replies. The server does not validate ownership of that email.
- Do not treat the demo login as real authentication. Add proper authentication (OAuth, JWT, sessions) before deploying publicly.

License
- This project is released under the MIT License — see [LICENSE](LICENSE).

Contributing
- Contributions welcome. Open a PR or issue describing the feature or fix.

