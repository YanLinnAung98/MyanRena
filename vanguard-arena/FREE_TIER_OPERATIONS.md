# MyanRena Free-Tier Operations

This note records the current hosting architecture and the limits to watch while keeping MyanRena on no-cost plans.

## Current architecture

- **Web delivery:** GitHub Pages serves the static Vite build.
- **Identity:** Firebase Authentication with email/password.
- **Cloud data:** Cloud Firestore stores public player profiles, social records, presence, invitations, matches, rooms, notifications, and tournament data.
- **Backend:** The repository contains an optional Node/WebSocket backend, but the GitHub Pages build runs in Firebase/serverless mode unless `VITE_USE_SERVER_API=true` is configured.
- **No paid Firebase runtime dependency is required by the current Firebase-only path.** The current frontend does not call Firebase Cloud Functions or Cloud Storage APIs.

## No-cost quotas to monitor

### Firebase Spark

Current published Cloud Firestore no-cost quotas for the Standard edition include:

- 1 GiB stored data
- 50,000 document reads per day
- 20,000 document writes per day
- 20,000 document deletes per day
- 10 GiB network egress per month

Most Firebase Authentication methods, including email/password, are no-cost. Phone authentication is billed separately. Cloud Functions and other paid Google Cloud services are not available on Spark.

If a Spark project's usage exceeds a no-cost quota, that product is shut off for the rest of the billing cycle rather than automatically charging the account. Check the Firebase Usage and Billing dashboard regularly.

Sources:
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/pricing

### GitHub Free and GitHub Pages

- Standard GitHub-hosted Actions runners are free for public repositories.
- Code scanning/CodeQL is available for public repositories.
- A published GitHub Pages site is limited to 1 GB, with a soft bandwidth limit of 100 GB per month.

Sources:
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Free-tier optimizations already in the code

- Firestore presence heartbeat is 60 seconds instead of 15 seconds. A continuously active device now writes about 1,440 presence updates per day instead of about 5,760.
- The live profile and presence listeners are capped at the 100 highest-XP profiles and 100 most recently active presence records, preventing every client from downloading the entire collection as the player base grows.
- Social presence considers a player online for up to 150 seconds after their last heartbeat, allowing missed mobile background heartbeats without immediately showing the player offline.
- Firestore presence documents contain only UID, online status, activity, and last-seen timestamp; they do not copy full profiles or personal information.
- Dependency audit, TypeScript validation, production build, game regression tests, backend smoke tests, and CodeQL analysis run through GitHub Actions.

## Firebase Console checklist

1. Keep the project on Spark if a strict zero-billing requirement is intended.
2. In Authentication, enable Email/Password and verify the GitHub Pages domain is in Authorized domains.
3. Publish the repository's `vanguard-arena/firestore.rules` to the active Firestore database. GitHub Pages deployment does not publish Firestore rules.
4. Keep email verification enabled; direct player challenges and protected match writes require a verified Firebase ID token.
5. Review Firestore reads, writes, storage, and egress in Firebase Usage and Billing. The limits are shared by all apps using the same Firebase project.
6. Do not enable paid Google Cloud services, Cloud Functions, or switch to Blaze unless the project owner explicitly accepts billing.

## Scaling note

Firestore presence is currently shared through a collection listener while the Social screen is open. As the player count and number of simultaneous Social viewers grow, presence reads can become the next Spark quota bottleneck. For a larger active community, consider moving ephemeral presence to Firebase Realtime Database (which has its own Spark quota) or using an authenticated server that can aggregate presence. That migration requires enabling/configuring the service and updating its security rules; it is not silently enabled by this codebase.
