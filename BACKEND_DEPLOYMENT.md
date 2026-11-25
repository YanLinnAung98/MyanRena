# MyanRena Backend Deployment

The GitHub Pages deployment is a static/offline-compatible frontend. It cannot host the Node.js API, SQLite database, or WebSocket server. Deploy the full application from the Render Blueprint in `render.yaml` to enable server-backed accounts, matchmaking, multiplayer games, tournaments, and social features.

## Deploy with Render

1. Push this repository to GitHub and keep the deployment branch as `main`.
2. In Render, choose **New → Blueprint**, connect `YanLinnAung98/MyanRena`, and select `main`.
3. Review the `myanrena-api` service created from `render.yaml`. The blueprint uses the Singapore region, Node.js 24.12, and a persistent disk mounted at `/var/data`.
4. Set `ADMIN_INITIAL_PASSWORD` in Render's secret/environment settings. Use a unique password with at least 12 characters. Never commit the value to this repository.
5. Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the Firebase Admin service-account JSON when Google/Firebase ID-token verification is required. Store the JSON only as a Render secret. Username/password authentication does not need this secret.
6. Keep `DATA_DIR=/var/data`. Do not remove the persistent disk or move SQLite data to an ephemeral directory.
7. Deploy the service and check `https://<your-render-domain>/healthz`. A healthy service returns JSON with `ok: true`.
8. Use the Render service URL as the main app URL. Add any custom frontend origin to `CORS_ORIGINS` if the frontend and API are hosted on different domains.

## Important deployment notes

- The Render service builds the frontend with `VITE_USE_SERVER_API=true` and serves the frontend, API, and WebSocket endpoint from the same origin.
- The WebSocket endpoint is `/ws`; it uses the authenticated session token.
- The Render persistent disk stores SQLite data and user uploads across deploys/restarts.
- The GitHub Pages URL remains a static deployment and does not become the backend automatically. Use the Render URL for the complete server-backed experience.
- `/api/auth/recover-email` is intentionally disabled until an email provider is configured. Players should save their six-digit Recovery PIN securely.
- The default administrator username is `yanlinnaung`. The administrator password is supplied only through `ADMIN_INITIAL_PASSWORD`.
- The administrator password exists only in the `ADMIN_INITIAL_PASSWORD` deployment secret. On an existing database, startup rotates the administrator password to the configured secret when it differs and revokes existing administrator sessions. If an administrator account already exists, the server will refuse to start when this secret is missing.
- The CI workflow starts the Node server and smoke-tests health, registration, login, social data, and authenticated WebSocket state before publishing the static Pages artifact.

## Local backend check

From `vanguard-arena/`:

```bash
npm install --legacy-peer-deps
npm run lint
npm run build
NODE_ENV=production DATA_DIR=./data PORT=3000 npm start
```

Then open `http://localhost:3000/healthz`.
