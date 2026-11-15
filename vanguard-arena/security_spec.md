# Security Specification — Vanguard Arena

## 1. Data Invariants
- A public user profile (`/users/{userId}`) can only be created or updated by its authenticated owner (`request.auth.uid == userId`) or an admin, and cannot assign admin roles or tamper with immutable `uid` / `createdAt`.
- Private PII (`/users/{userId}/private/info`) is strictly isolated from public reads; only the owner (`isOwner(userId)`) or a verified admin (`isAdmin()`) may read or write it.
- Matches (`/matches/{matchId}`) require valid participant ownership (`player1Id == request.auth.uid` or `player2Id == request.auth.uid`) and lock all writes once `status == 'finished'` unless overridden by `isAdmin()`.
- Frames (`/frames/{frameId}`), feature locks (`/featureLocks/{lockId}`), and tournaments (`/tournaments/{tournamentId}`) can only be mutated by verified admins (`isAdmin()`).
- All string fields enforce strict `.size()` bounds and ID path variables enforce `isValidId()`.

## 2. Adversarial "Dirty Dozen" Payloads Blocked by Rules
1. Unauthenticated read of `/users/{uid}/private/info` -> `PERMISSION_DENIED`
2. Authenticated non-owner read of `/users/{otherUid}/private/info` -> `PERMISSION_DENIED`
3. Shadow field injection (`isAdmin: true`, `role: 'admin'`) on `/users/{uid}` create -> `PERMISSION_DENIED`
4. Oversized 10KB string injected into `displayName` or `gameId` -> `PERMISSION_DENIED`
5. Malicious path ID (`../admin` or 1.5KB string) in `{userId}` or `{matchId}` -> `PERMISSION_DENIED`
6. Spoofed `uid` mismatch (`incoming().uid != request.auth.uid`) -> `PERMISSION_DENIED`
7. Modifying a finished match (`existing().status == 'finished'`) by non-admin -> `PERMISSION_DENIED`
8. Non-admin creating or deleting `/frames/{frameId}` -> `PERMISSION_DENIED`
9. Non-admin toggling `/featureLocks/{lockId}` -> `PERMISSION_DENIED`
10. Unverified email admin spoof (`email_verified: false` matching admin email) -> `PERMISSION_DENIED`
11. Modifying immutable `createdAt` on `/matches/{matchId}` update -> `PERMISSION_DENIED`
12. Blanket `list` query on `/users/{uid}/private` by non-owner -> `PERMISSION_DENIED`
