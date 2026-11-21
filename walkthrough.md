# Security Summary

**Reviewed Files**: 22 (`server.ts`, `src/firebase.ts`, `src/hooks/useStudentWorkspace.ts`, `firestore.rules`, `.gitignore`, `.env.example`, `index.html`, and all UI components)
**Issues Resolved**: 2

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Git-Tracked Firebase Config (`Google API Key` alert) | `.gitignore` / `src/firebase.ts` | 9 / 24 | `firebase-applet-config.json` (which contains the Firebase Web client `apiKey`) was not excluded by `.gitignore`, causing GitHub Secret Scanning to flag the `AIza...` browser key when pushed to `ememkpong/Student-Manager`. | Medium (Firebase Web API keys are client identifiers, not backend secrets, though unrestricted keys or committed `.env` files can risk quota abuse) | Needs Follow-Up | Added `firebase-applet-config.json` to `.gitignore`, created `firebase-applet-config.example.json` + `VITE_FIREBASE_*` placeholders in `.env.example`, and updated `src/firebase.ts` to support environment-variable fallback when `firebase-applet-config.json` is excluded from GitHub. Requires rotating/restricting the exposed key in Google Cloud Console and removing the file from GitHub commit history. |
| Unbounded Request Payloads & Verbose 500 Errors | `server.ts` | 58 / 79 | `/api/schedule/generate` and `/api/tasks/parse` accepted uncapped strings/arrays and returned raw SDK exception strings on unexpected 500 errors. | Low | Fixed | Added explicit length/count bounds (`slice`) on `activitiesText`, `text`, `classes`, `tasks`, `focusNote`, and preferences, and normalized unexpected 500 errors to a safe generic message. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Gemini Server API Key | `server.ts` | `GEMINI_API_KEY` is read strictly on the backend from `process.env.GEMINI_API_KEY` and never included in client bundles or `.env.example`. |
| Firestore Access Control & PII Isolation | `firestore.rules` | Every student profile (`/users/{userId}`) and subcollection (`classes`, `tasks`, `activities`, `scheduleBlocks`, `transactions`, `bills`, `settings`) requires verified Google Auth (`email_verified == true`), strict UID ownership, strict field schemas, and bounded string/array limits; `/users` listing is disabled (`allow list: if false`). |
| Client Rendering & DOM Sinks | `src/components/*.tsx` | All user-supplied names, Gmail addresses, courses, tasks, and notes are rendered through React's built-in text escaping with zero `dangerouslySetInnerHTML`, `innerHTML`, or `eval` usage. |
| Dependency Audit | `package.json` / `bun.lock` | `bun audit` found zero direct vulnerabilities in application code and two transitive advisories in `@grpc/grpc-js@1.9.16` (pulled via `@firebase/firestore-compat` inside `firebase`, server-side gRPC code not executed by browser WebChannel/REST transport). |

## PoC Verification

### GitHub Secret Scanning & Client Config Exclusion

#### Summary
| Field | Value |
|---|---|
| Issue Type | Git-Tracked Client API Key Configuration |
| Impact | Medium |
| Affected File | `.gitignore:9` & `src/firebase.ts:24` |
| Test Scenario | Simulated GitHub repository push without `firebase-applet-config.json` tracked, plus Vite build with `firebase-applet-config.json` ignored by git. |

#### How It Was Fixed
Added `firebase-applet-config.json` to `.gitignore` so future commits never push the generated key file to `ememkpong/Student-Manager`, created `firebase-applet-config.example.json` and `VITE_FIREBASE_*` placeholders in `.env.example`, and switched `src/firebase.ts` to `import.meta.glob` with `VITE_FIREBASE_*` environment fallback so builds work both in AI Studio and on clean GitHub clones.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Developer runs `git status` / `git add .` after `.gitignore` update | `firebase-applet-config.json` is skipped by git |
| 2 | Clean GitHub clone configures `VITE_FIREBASE_*` env vars or copies `firebase-applet-config.example.json` | No literal `AIza...` key exists in tracked repository files |
| 3 | `src/firebase.ts:24-45` resolves local config if present or `import.meta.env.VITE_FIREBASE_*` | **Handled Safely** (zero committed keys, AI Studio preview & external builds both work) |

#### Conclusion
**Fix Verified** - Future pushes exclude `firebase-applet-config.json` while keeping AI Studio preview and clean external builds functional; manual rotation/restriction and git-history cleanup will clear the existing alert on `ememkpong/Student-Manager`.

### Unbounded AI Endpoint Payload & Error Leak Guard

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unbounded Input & Raw Exception Reflection |
| Impact | Low |
| Affected File | `server.ts:58`, `server.ts:79-125`, `server.ts:243-250` |
| Test Scenario | `POST /api/tasks/parse` with oversized `text` (> 10,000 chars) or non-array `classes`, or upstream SDK failure returning an internal error string. |

#### How It Was Fixed
Validated types and clamped incoming string lengths (`slice(0, 4000)`) and array counts (`slice(0, 30)` / `slice(0, 50)`) before invoking Gemini, and replaced raw 500 error propagation in `handleGeminiError` with a generic error message.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Oversized payload hits `POST /api/tasks/parse` (`server.ts:240`) | Request enters Express JSON parser (`limit: "1mb"`) |
| 2 | `safeText` and `safeClasses` clamp input at `server.ts:243-249` | Truncated to safe bounds before Gemini prompt assembly |
| 3 | Any unexpected internal exception reaches `handleGeminiError` (`server.ts:56-59`) | **Handled Safely** (returns static error string without internal details) |

#### Conclusion
**Fix Verified** - AI API routes enforce bounded inputs and never reflect raw internal error details or server secrets.
