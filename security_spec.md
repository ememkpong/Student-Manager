# Termflow Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: Every document under `/users/{userId}` (including `/users/{userId}` itself and all subcollections: `settings`, `classes`, `tasks`, `activities`, `scheduleBlocks`, `transactions`, `bills`, `goals`) belongs exclusively to `request.auth.uid == userId`. Profile PII (`name`, `gmail`) is never listable (`allow list: if false`) and never readable by other users.
2. **Verified Email Mandate**: All authenticated reads and writes require `request.auth != null && request.auth.token.email_verified == true`.
3. **Parent Integrity (Master Gate)**: No subcollection document (`settings`, `classes`, `tasks`, `activities`, `scheduleBlocks`, `transactions`, `bills`, `goals`) may be created or updated unless `/users/{userId}` exists (`exists(/databases/$(database)/documents/users/$(userId))`).
4. **Immutable Ownership & Creation Timestamps**: `uid` / `ownerId` and `id` must match the authenticated user and path document ID, and cannot be reassigned on update. `createdAt` (or `recordedAt` on `tasks`) must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
5. **Strict Schema & Bounds**: Every write enforces required/allowed keys (`hasAll` + `hasOnly`), type checks, regex patterns (`^[a-zA-Z0-9_\\-]+$`, `HH:MM`, `YYYY-MM-DD`, `YYYY-MM`), string length bounds, bounded `days` array (`1..7` valid weekdays), and numeric bounds (`amount >= 0 && amount <= 100000000`, `dueDay 1..31`, etc.).
6. **Action-Scoped Updates**: Every `allow update` begins with `isValid[Entity](incoming())` and partitions permitted mutations with `incoming().diff(existing()).affectedKeys().hasOnly([...])`.
7. **Secure List Queries**: Subcollection `allow list` rules explicitly enforce `isOwner(userId) && existing().ownerId == request.auth.uid` without `get()` or `exists()` lookups.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Profile Read (`GET /users/userA`)**: `auth = null` -> **PERMISSION_DENIED**.
2. **Profile Listing Enumeration (`LIST /users`)**: authenticated `userB` attempting to list `/users` -> **PERMISSION_DENIED** (`allow list: if false`).
3. **Cross-User PII Read (`GET /users/userA`)**: authenticated `userB` reading `userA` profile -> **PERMISSION_DENIED**.
4. **Unverified Email Write (`CREATE /users/userA`)**: `email_verified = false` -> **PERMISSION_DENIED**.
5. **Identity Spoofing (`CREATE /users/userA/tasks/tsk-1`)**: `userB` writing `ownerId: "userA"` or `userA` writing `ownerId: "userB"` -> **PERMISSION_DENIED**.
6. **Shadow Ghost Field Injection (`CREATE /users/userA`)**: extra field `isAdmin: true` or `role: "admin"` -> **PERMISSION_DENIED** (`keys().hasOnly(...)`).
7. **Timestamp Forgery (`CREATE /users/userA`)**: client passes forged `createdAt` != `request.time` -> **PERMISSION_DENIED**.
8. **Immutable Field Hijack (`UPDATE /users/userA/transactions/tx-1`)**: changing `ownerId` or `createdAt` -> **PERMISSION_DENIED**.
9. **ID Poisoning / Oversized Document ID (`CREATE /users/userA/tasks/<200-char-invalid-id>`)**: fails `isValidId()` -> **PERMISSION_DENIED**.
10. **Array Exhaustion / Invalid Element (`CREATE /users/userA/classes/cls-1`)**: `days: ["Mon", "Funday"]` or 8+ items -> **PERMISSION_DENIED** (`days.size() <= 7 && days.hasOnly(...)`).
11. **Value Poisoning on Update (`UPDATE /users/userA`)**: setting `name` to a 5,000-character string or non-email `gmail` -> **PERMISSION_DENIED** (`isValidStudentProfile` wraps `allow update`).
12. **Unscoped List Query (`LIST /users/userA/tasks`)**: listing without `where('ownerId', '==', uid)` or as `userB` -> **PERMISSION_DENIED** (`existing().ownerId == request.auth.uid`).
