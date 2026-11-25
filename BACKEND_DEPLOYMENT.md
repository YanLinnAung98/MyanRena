# MyanRena Backend Deployment

The GitHub Pages deployment is a static/offline-compatible frontend. It cannot host the Node.js API, SQLite database, or WebSocket server. The Render Blueprint in `render.yaml` is configured for the **$0 Free web-service plan** so the backend can be tested without a hosting charge. This is a hobby/test deployment, not durable production hosting.

## Deploy with Render

1. Push this repository to GitHub and keep the deployment branch as `main`.
2. In Render, choose **New → Blueprint**, connect `YanLinnAung98/MyanRena`, and select `main`.
3. Review the `myanrena-api` service created from `render.yaml`. The Blueprint uses Render's Free web-service plan in Singapore and Node.js 24.22.1. It has no persistent disk and uses `/tmp/myanrena-data` only for temporary SQLite files.
4. Set `ADMIN_INITIAL_PASSWORD` in Render's secret/environment settings. Use a unique password with at least 12 characters. Never commit the value to this repository.
5. Set `FIREBASE_SERVICE_ACCOUNT_JSON` to the Firebase Admin service-account JSON when Google/Firebase ID-token verification is required. Store the JSON only as a Render secret. Username/password authentication does not need this secret.
6. Keep `DATA_DIR=/tmp/myanrena-data` for the free test deployment. **Do not store real player accounts or valuable match history here:** Render Free files are ephemeral and SQLite data is lost after restart, redeploy, or spin-down.
7. Deploy the service and check `https://<your-render-domain>/healthz`. A healthy service returns JSON with `ok: true`.
8. Use the Render service URL as the main app URL. Add any custom frontend origin to `CORS_ORIGINS` if the frontend and API are hosted on different domains.

## Important deployment notes

- The Render service builds the frontend with `VITE_USE_SERVER_API=true` and serves the frontend, API, and WebSocket endpoint from the same origin.
- The WebSocket endpoint is `/ws`; it uses the authenticated session token.
- Free Render web services sleep after 15 minutes without inbound HTTP/WebSocket activity and take about a minute to wake. The free filesystem is ephemeral; SQLite records and uploaded files can disappear whenever the service restarts, redeploys, or spins down.
- The GitHub Pages URL remains a static deployment and does not become the backend automatically. Use the Render URL for the complete server-backed experience.
- `/api/auth/recover-email` is intentionally disabled until an email provider is configured. Players should save their six-digit Recovery PIN securely.
- The default administrator username is `yanlinnaung`. The administrator password is supplied only through `ADMIN_INITIAL_PASSWORD`.
- The administrator password exists only in the `ADMIN_INITIAL_PASSWORD` deployment secret. On an existing database, startup rotates the administrator password to the configured secret when it differs and revokes existing administrator sessions. If an administrator account already exists, the server will refuse to start when this secret is missing.
- The CI workflow starts the Node server and smoke-tests health, registration, login, social data, and authenticated WebSocket state before publishing the static Pages artifact.

## Free-tier limits and durable-data requirement

Render Free provides 750 instance-hours per workspace per calendar month, which is enough for one service to run continuously for that month if it does not exceed other quotas. Free web services sleep after 15 minutes idle. Free web services do not support persistent disks. See the [Render Free plan limits](https://render.com/docs/free).

The current SQLite backend is **not safe for long-term user data on Render Free**. Before inviting real users or treating account creation, profiles, social relationships, or match history as durable, migrate the backend database to a persistent free database such as Supabase Free (500 MB, with inactivity pausing) or another user-approved free database. That migration requires changing the synchronous SQLite data layer; it is not achieved simply by changing the Render plan. Keep the current service for functional testing only until that work is complete.

## Existing data and account migration

The current backend stores username/password accounts, match data, and social relationships in SQLite. On Render Free, that SQLite file is ephemeral and must be treated as disposable test data. Existing Firestore-only player documents are **not automatically copied** into the new SQLite database. Keep the existing Firebase project and data intact until a controlled migration has been completed. Do not delete the original Firestore collections as part of the Render setup.

The frontend's local/offline demo accounts are browser-specific and are not uploaded to the backend. Players who created accounts only in a browser's local storage need a separate import process before switching devices or moving to the hosted backend.

## Dependency security note (checked 25 November 2026)

CI currently reports four high-severity npm audit entries in the Firebase dependency chain. The actionable gRPC finding is caused by the Firebase Firestore package's pinned `@grpc/grpc-js` 1.9.x dependency. The Firebase maintainers merged [PR #10412](https://github.com/firebase/firebase-js-sdk/pull/10412) on 24 November 2026 to upgrade Firestore to gRPC 1.14.7 and add the corresponding connection-termination safeguards. The latest published Firebase JS SDK release notes currently list 13.4.0 (16 November 2026), which predates that merge. The CI audit step therefore reports the finding without forcing an unsafe major downgrade or an override that bypasses the upstream Firestore compatibility changes. Re-run `npm audit` after a Firebase release that includes PR #10412.

## Local backend check

From `vanguard-arena/`:

```bash
npm install --legacy-peer-deps
npm run lint
npm run build
NODE_ENV=production DATA_DIR=./data PORT=3000 npm start
```

Then open `http://localhost:3000/healthz`.
