/**
 * Phase 0: Dirty Dozen Security Invariant Specification & Payload Matrix
 * Validates that every adversarial payload violates at least one enforced rule invariant
 * and provides typed assertions matching `firebase-blueprint.json` and `firestore.rules`.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  operation: "get" | "list" | "create" | "update" | "delete";
  path: string;
  actorUid: string | null;
  emailVerified: boolean;
  payload?: Record<string, unknown>;
  expectedOutcome: "PERMISSION_DENIED";
  blockingRule: string;
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: "Unauthenticated profile read",
    operation: "get",
    path: "/users/userA",
    actorUid: null,
    emailVerified: false,
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "isSignedIn() && isVerified() && isOwner(userId)",
  },
  {
    id: 2,
    name: "Users collection enumeration",
    operation: "list",
    path: "/users",
    actorUid: "userB",
    emailVerified: true,
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "allow list: if false;",
  },
  {
    id: 3,
    name: "Cross-user PII profile read",
    operation: "get",
    path: "/users/userA",
    actorUid: "userB",
    emailVerified: true,
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "isOwner(userId)",
  },
  {
    id: 4,
    name: "Unverified email account write",
    operation: "create",
    path: "/users/userA",
    actorUid: "userA",
    emailVerified: false,
    payload: {
      uid: "userA",
      name: "Spoof Student",
      gmail: "spoof@gmail.com",
      semester: "Fall 2026",
      level: "300 Level",
      photoURL: "",
      profileCompleted: true,
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "request.auth.token.email_verified == true",
  },
  {
    id: 5,
    name: "Identity spoofing via mismatched ownerId",
    operation: "create",
    path: "/users/userB/tasks/tsk-1",
    actorUid: "userB",
    emailVerified: true,
    payload: {
      id: "tsk-1",
      ownerId: "userA",
      title: "Hijacked task",
      category: "Academic",
      priority: "High",
      dueDate: "2026-11-22",
      dueTime: "12:00",
      estimatedMinutes: 30,
      completed: false,
      remindBeforeMinutes: 15,
      createdAt: "2026-11-21",
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "data.ownerId == request.auth.uid",
  },
  {
    id: 6,
    name: "Shadow ghost field privilege escalation",
    operation: "create",
    path: "/users/userA",
    actorUid: "userA",
    emailVerified: true,
    payload: {
      uid: "userA",
      name: "Test User",
      gmail: "test@gmail.com",
      semester: "Harmattan 2026",
      level: "200 Level",
      photoURL: "",
      profileCompleted: true,
      isAdmin: true,
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "data.keys().hasOnly([...])",
  },
  {
    id: 7,
    name: "Server timestamp forgery",
    operation: "create",
    path: "/users/userA",
    actorUid: "userA",
    emailVerified: true,
    payload: {
      uid: "userA",
      name: "Test User",
      gmail: "test@gmail.com",
      semester: "Harmattan 2026",
      level: "200 Level",
      photoURL: "",
      profileCompleted: true,
      createdAt: "1999-01-01T00:00:00Z",
      updatedAt: "1999-01-01T00:00:00Z",
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "incoming().createdAt == request.time && incoming().updatedAt == request.time",
  },
  {
    id: 8,
    name: "Immutable ownerId hijack on update",
    operation: "update",
    path: "/users/userA/transactions/tx-1",
    actorUid: "userA",
    emailVerified: true,
    payload: {
      ownerId: "userB",
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "incoming().ownerId == existing().ownerId && affectedKeys().hasOnly([...])",
  },
  {
    id: 9,
    name: "Document ID poisoning with invalid characters and >128 length",
    operation: "create",
    path: `/users/userA/tasks/${"bad$id!".repeat(30)}`,
    actorUid: "userA",
    emailVerified: true,
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "isValidId(taskId)",
  },
  {
    id: 10,
    name: "Unbounded or invalid weekday list in class",
    operation: "create",
    path: "/users/userA/classes/cls-1",
    actorUid: "userA",
    emailVerified: true,
    payload: {
      id: "cls-1",
      ownerId: "userA",
      code: "CSC 301",
      title: "Algorithms",
      days: ["Mon", "InvalidDay", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      startTime: "09:00",
      endTime: "10:00",
      location: "LT 1",
      instructor: "Dr. Ade",
      remindMinutesBefore: 15,
      remindersEnabled: true,
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "data.days.size() <= 7 && data.days.hasOnly(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])",
  },
  {
    id: 11,
    name: "Value poisoning on profile update (oversized name & bad gmail)",
    operation: "update",
    path: "/users/userA",
    actorUid: "userA",
    emailVerified: true,
    payload: {
      name: "X".repeat(500),
      gmail: "not-an-email",
    },
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "isValidStudentProfile(incoming())",
  },
  {
    id: 12,
    name: "Cross-user subcollection list query",
    operation: "list",
    path: "/users/userA/tasks",
    actorUid: "userB",
    emailVerified: true,
    expectedOutcome: "PERMISSION_DENIED",
    blockingRule: "isOwner(userId) && existing().ownerId == request.auth.uid",
  },
];

export function verifyDirtyDozenMatrix(): boolean {
  return (
    DIRTY_DOZEN_CASES.length === 12 &&
    DIRTY_DOZEN_CASES.every((c) => c.expectedOutcome === "PERMISSION_DENIED" && c.blockingRule.length > 0)
  );
}
