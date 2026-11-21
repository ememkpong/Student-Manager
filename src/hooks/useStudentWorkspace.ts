import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import {
  DEFAULT_BUDGET_LIMITS,
  DEFAULT_PREFERENCES,
} from "../data/defaultData";
import {
  auth,
  clampNumber,
  clampString,
  db,
  handleFirestoreError,
  normalizeBlockCategory,
  normalizeBudgetCategory,
  normalizeHHMM,
  normalizeISODate,
  normalizePriority,
  normalizeTaskCategory,
  normalizeWeekday,
  normalizeWeekdaysList,
  OperationType,
  sanitizeBudgetLimits,
  sanitizeId,
  sanitizePreferences,
} from "../firebase";
import type {
  AcademicGoal,
  ActivityRequest,
  BudgetLimits,
  RecurringBill,
  ScheduleBlock,
  SchedulePreferences,
  StudentClass,
  StudentProfile,
  TodoTask,
  Transaction,
} from "../types";
import { formatISODate, getCurrentMonthPrefix } from "../utils/dateUtils";

interface TimestampedDoc {
  createdAt?: Timestamp;
  recordedAt?: Timestamp;
}

function toMillis(ts?: Timestamp): number {
  if (!ts || typeof ts.toMillis !== "function") return 0;
  return ts.toMillis();
}

export function useStudentWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [activitiesList, setActivitiesList] = useState<ActivityRequest[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [goals, setGoals] = useState<AcademicGoal[]>([]);

  const [activitiesPrompt, setActivitiesPromptState] = useState<string>("");
  const [scheduleSummary, setScheduleSummaryState] = useState<string>("");
  const [preferences, setPreferencesState] =
    useState<SchedulePreferences>(DEFAULT_PREFERENCES);
  const [budgetLimits, setBudgetLimitsState] =
    useState<BudgetLimits>(DEFAULT_BUDGET_LIMITS);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [browserAlertsEnabled, setBrowserAlertsEnabledState] =
    useState<boolean>(false);

  const promptTimerRef = useRef<number | null>(null);
  const prefsTimerRef = useRef<number | null>(null);

  const captureError = useCallback((fn: () => never) => {
    try {
      fn();
    } catch (err) {
      setFatalError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setProfile(null);
        setClasses([]);
        setTasks([]);
        setActivitiesList([]);
        setScheduleBlocks([]);
        setTransactions([]);
        setBills([]);
        setGoals([]);
        setActivitiesPromptState("");
        setScheduleSummaryState("");
        setWorkspaceReady(false);
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap clean student workspace if first visit, then subscribe
  useEffect(() => {
    if (!authReady || !user) return;
    let cancelled = false;
    const uid = user.uid;
    const unsubscribers: Array<() => void> = [];

    const initializeCleanWorkspace = async () => {
      const settingsRef = doc(db, "users", uid, "settings", "workspace");
      await setDoc(settingsRef, {
        ownerId: uid,
        activitiesPrompt: "",
        scheduleSummary: "",
        soundEnabled: true,
        browserAlertsEnabled: false,
        seededDemo: false,
        preferences: sanitizePreferences(DEFAULT_PREFERENCES),
        budgetLimits: sanitizeBudgetLimits(DEFAULT_BUDGET_LIMITS),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    };

    const initAndSubscribe = async () => {
      const userPath = `users/${uid}`;
      const userRef = doc(db, "users", uid);
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const fallbackName = clampString(
            user.displayName || user.email?.split("@")[0] || "Student",
            120,
            "Student"
          );
          const fallbackGmail = clampString(
            user.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)
              ? user.email
              : "student@gmail.com",
            160,
            "student@gmail.com"
          );
          await setDoc(userRef, {
            uid,
            name: fallbackName,
            gmail: fallbackGmail,
            semester: "",
            level: "",
            photoURL: clampString(user.photoURL || "", 500),
            profileCompleted: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        if (!cancelled) {
          captureError(() =>
            handleFirestoreError(err, OperationType.WRITE, userPath)
          );
        }
        return;
      }

      const settingsPath = `users/${uid}/settings/workspace`;
      try {
        const settingsSnap = await getDoc(
          doc(db, "users", uid, "settings", "workspace")
        );
        if (!settingsSnap.exists()) {
          await initializeCleanWorkspace();
        }
      } catch (err) {
        if (!cancelled) {
          captureError(() =>
            handleFirestoreError(err, OperationType.WRITE, settingsPath)
          );
        }
        return;
      }

      if (cancelled) return;

      // Subscribe to user profile
      unsubscribers.push(
        onSnapshot(
          userRef,
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setProfile({
                uid: String(d.uid || uid),
                name: String(d.name || ""),
                gmail: String(d.gmail || ""),
                semester: String(d.semester || ""),
                level: String(d.level || ""),
                photoURL: String(d.photoURL || ""),
                profileCompleted: Boolean(d.profileCompleted),
              });
            }
            setWorkspaceReady(true);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.GET, userPath)
            )
        )
      );

      // Subscribe to workspace settings
      unsubscribers.push(
        onSnapshot(
          doc(db, "users", uid, "settings", "workspace"),
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setActivitiesPromptState(
                typeof d.activitiesPrompt === "string" ? d.activitiesPrompt : ""
              );
              setScheduleSummaryState(
                typeof d.scheduleSummary === "string" ? d.scheduleSummary : ""
              );
              setSoundEnabledState(Boolean(d.soundEnabled));
              setBrowserAlertsEnabledState(Boolean(d.browserAlertsEnabled));
              if (d.preferences) {
                setPreferencesState(
                  sanitizePreferences(d.preferences as SchedulePreferences)
                );
              }
              if (d.budgetLimits) {
                setBudgetLimitsState(
                  sanitizeBudgetLimits(d.budgetLimits as BudgetLimits)
                );
              }
            }
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.GET, settingsPath)
            )
        )
      );

      // Subscribe to classes
      const classesPath = `users/${uid}/classes`;
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "users", uid, "classes"), where("ownerId", "==", uid)),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as StudentClass & TimestampedDoc }))
              .sort((a, b) => toMillis(a.data.createdAt) - toMillis(b.data.createdAt))
              .map(({ data }) => ({
                id: data.id,
                code: data.code,
                title: data.title,
                days: data.days,
                startTime: data.startTime,
                endTime: data.endTime,
                location: data.location,
                instructor: data.instructor,
                remindMinutesBefore: data.remindMinutesBefore,
                remindersEnabled: data.remindersEnabled,
              }));
            setClasses(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, classesPath)
            )
        )
      );

      // Subscribe to tasks
      const tasksPath = `users/${uid}/tasks`;
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "users", uid, "tasks"), where("ownerId", "==", uid)),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as TodoTask & TimestampedDoc }))
              .sort((a, b) => toMillis(b.data.recordedAt) - toMillis(a.data.recordedAt))
              .map(({ data }) => ({
                id: data.id,
                title: data.title,
                category: data.category,
                priority: data.priority,
                dueDate: data.dueDate,
                dueTime: data.dueTime,
                estimatedMinutes: data.estimatedMinutes,
                ...(data.courseCode ? { courseCode: data.courseCode } : {}),
                ...(data.notes ? { notes: data.notes } : {}),
                completed: data.completed,
                remindBeforeMinutes: data.remindBeforeMinutes,
                createdAt: data.createdAt,
              }));
            setTasks(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, tasksPath)
            )
        )
      );

      // Subscribe to activities
      const activitiesPath = `users/${uid}/activities`;
      unsubscribers.push(
        onSnapshot(
          query(
            collection(db, "users", uid, "activities"),
            where("ownerId", "==", uid)
          ),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as ActivityRequest & TimestampedDoc }))
              .sort((a, b) => toMillis(a.data.createdAt) - toMillis(b.data.createdAt))
              .map(({ data }) => ({
                id: data.id,
                title: data.title,
                durationMinutes: data.durationMinutes,
                frequency: data.frequency,
                preferredWindow: data.preferredWindow,
                category: data.category,
              }));
            setActivitiesList(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, activitiesPath)
            )
        )
      );

      // Subscribe to schedule blocks
      const blocksPath = `users/${uid}/scheduleBlocks`;
      unsubscribers.push(
        onSnapshot(
          query(
            collection(db, "users", uid, "scheduleBlocks"),
            where("ownerId", "==", uid)
          ),
          (snap) => {
            const list = snap.docs.map((d) => {
              const data = d.data() as ScheduleBlock;
              return {
                id: data.id,
                title: data.title,
                day: data.day,
                startTime: data.startTime,
                endTime: data.endTime,
                category: data.category,
                ...(data.location ? { location: data.location } : {}),
                ...(data.notes ? { notes: data.notes } : {}),
                sourceType: data.sourceType,
                ...(data.sourceId ? { sourceId: data.sourceId } : {}),
                completed: Boolean(data.completed),
              };
            });
            setScheduleBlocks(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, blocksPath)
            )
        )
      );

      // Subscribe to transactions
      const txPath = `users/${uid}/transactions`;
      unsubscribers.push(
        onSnapshot(
          query(
            collection(db, "users", uid, "transactions"),
            where("ownerId", "==", uid)
          ),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as Transaction & TimestampedDoc }))
              .sort((a, b) => {
                const dateCmp = b.data.date.localeCompare(a.data.date);
                if (dateCmp !== 0) return dateCmp;
                return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
              })
              .map(({ data }) => ({
                id: data.id,
                title: data.title,
                amount: data.amount,
                type: data.type,
                category: data.category,
                date: data.date,
                ...(data.notes ? { notes: data.notes } : {}),
              }));
            setTransactions(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, txPath)
            )
        )
      );

      // Subscribe to recurring bills
      const billsPath = `users/${uid}/bills`;
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "users", uid, "bills"), where("ownerId", "==", uid)),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as RecurringBill & TimestampedDoc }))
              .sort((a, b) => a.data.dueDay - b.data.dueDay)
              .map(({ data }) => ({
                id: data.id,
                title: data.title,
                amount: data.amount,
                dueDay: data.dueDay,
                category: data.category,
                ...(data.lastPaidMonth
                  ? { lastPaidMonth: data.lastPaidMonth }
                  : {}),
              }));
            setBills(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, billsPath)
            )
        )
      );

      // Subscribe to academic goals
      const goalsPath = `users/${uid}/goals`;
      unsubscribers.push(
        onSnapshot(
          query(collection(db, "users", uid, "goals"), where("ownerId", "==", uid)),
          (snap) => {
            const list = snap.docs
              .map((d) => ({ data: d.data() as AcademicGoal & TimestampedDoc }))
              .sort((a, b) => {
                if (a.data.completed !== b.data.completed) {
                  return a.data.completed ? 1 : -1;
                }
                return toMillis(b.data.createdAt) - toMillis(a.data.createdAt);
              })
              .map(({ data }) => ({
                id: data.id,
                title: data.title,
                ...(data.courseCode ? { courseCode: data.courseCode } : {}),
                ...(data.description ? { description: data.description } : {}),
                currentValue: data.currentValue,
                targetValue: data.targetValue,
                unit: data.unit,
                ...(data.targetDate ? { targetDate: data.targetDate } : {}),
                completed: Boolean(data.completed),
              }));
            setGoals(list);
          },
          (err) =>
            captureError(() =>
              handleFirestoreError(err, OperationType.LIST, goalsPath)
            )
        )
      );
    };

    void initAndSubscribe();

    return () => {
      cancelled = true;
      unsubscribers.forEach((u) => u());
      if (promptTimerRef.current) window.clearTimeout(promptTimerRef.current);
      if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
    };
  }, [authReady, user, captureError]);

  if (fatalError) {
    throw fatalError;
  }

  // --- Profile, Onboarding & Auth Mutations ---
  const saveProfile = async (
    input: {
      name: string;
      gmail: string;
      semester: string;
      level: string;
    },
    initialCourses: Omit<StudentClass, "id">[] = []
  ) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}`;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", uid), {
        name: clampString(input.name, 120, "Student"),
        gmail: clampString(input.gmail, 160),
        semester: clampString(input.semester, 80),
        level: clampString(input.level, 60),
        photoURL: clampString(profile?.photoURL || user.photoURL || "", 500),
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      });

      const baseTs = Date.now();
      initialCourses.slice(0, 25).forEach((cls, idx) => {
        const id = sanitizeId(`cls-${baseTs}-${idx}`);
        const days = normalizeWeekdaysList(cls.days);
        const startTime = normalizeHHMM(cls.startTime, "09:00");
        const endTime = normalizeHHMM(cls.endTime, "10:00");
        const code = clampString(cls.code, 32, "COURSE");
        const title = clampString(cls.title, 140, "Class");
        const location = clampString(cls.location, 140);
        const instructor = clampString(cls.instructor, 120);

        batch.set(doc(db, "users", uid, "classes", id), {
          id,
          ownerId: uid,
          code,
          title,
          days,
          startTime,
          endTime,
          location,
          instructor,
          remindMinutesBefore: clampNumber(cls.remindMinutesBefore, 0, 240, 15),
          remindersEnabled: Boolean(cls.remindersEnabled),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        days.forEach((day) => {
          const blkId = sanitizeId(`blk-${id}-${day}`);
          batch.set(doc(db, "users", uid, "scheduleBlocks", blkId), {
            id: blkId,
            ownerId: uid,
            title: clampString(`${code}: ${title}`, 180),
            day,
            startTime,
            endTime,
            category: "class",
            ...(location ? { location } : {}),
            ...(instructor ? { notes: clampString(instructor, 400) } : {}),
            sourceType: "class",
            sourceId: id,
            completed: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // --- Workspace Settings Mutations ---
  const setActivitiesPrompt = (val: string) => {
    setActivitiesPromptState(val);
    if (!user) return;
    if (promptTimerRef.current) window.clearTimeout(promptTimerRef.current);
    const uid = user.uid;
    promptTimerRef.current = window.setTimeout(async () => {
      const path = `users/${uid}/settings/workspace`;
      try {
        await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
          activitiesPrompt: clampString(val, 3000),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        captureError(() =>
          handleFirestoreError(err, OperationType.UPDATE, path)
        );
      }
    }, 600);
  };

  const setPreferences = (next: SchedulePreferences) => {
    const clean = sanitizePreferences(next);
    setPreferencesState(clean);
    if (!user) return;
    if (prefsTimerRef.current) window.clearTimeout(prefsTimerRef.current);
    const uid = user.uid;
    prefsTimerRef.current = window.setTimeout(async () => {
      const path = `users/${uid}/settings/workspace`;
      try {
        await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
          preferences: clean,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        captureError(() =>
          handleFirestoreError(err, OperationType.UPDATE, path)
        );
      }
    }, 500);
  };

  const setBudgetLimits = async (next: BudgetLimits) => {
    const clean = sanitizeBudgetLimits(next);
    setBudgetLimitsState(clean);
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/settings/workspace`;
    try {
      await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
        budgetLimits: clean,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const toggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabledState(next);
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/settings/workspace`;
    try {
      await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
        soundEnabled: next,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const setBrowserAlerts = async (enabled: boolean) => {
    setBrowserAlertsEnabledState(enabled);
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/settings/workspace`;
    try {
      await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
        browserAlertsEnabled: enabled,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  // --- Academic Goals CRUD ---
  const addGoal = async (goal: Omit<AcademicGoal, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(
      `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    const path = `users/${uid}/goals/${id}`;
    const targetValue = clampNumber(goal.targetValue, 1, 100000, 100);
    const currentValue = clampNumber(goal.currentValue, 0, 100000, 0);
    const completed = Boolean(goal.completed) || currentValue >= targetValue;
    const cleanTargetDate =
      goal.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(goal.targetDate.trim())
        ? goal.targetDate.trim()
        : undefined;

    try {
      await setDoc(doc(db, "users", uid, "goals", id), {
        id,
        ownerId: uid,
        title: clampString(goal.title, 160, "Semester Goal"),
        ...(goal.courseCode?.trim()
          ? { courseCode: clampString(goal.courseCode, 32) }
          : {}),
        ...(goal.description?.trim()
          ? { description: clampString(goal.description, 300) }
          : {}),
        currentValue,
        targetValue,
        unit: clampString(goal.unit, 32, "%"),
        ...(cleanTargetDate ? { targetDate: cleanTargetDate } : {}),
        completed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const updateGoalProgress = async (
    id: string,
    nextValue: number,
    explicitCompleted?: boolean
  ) => {
    if (!user) return;
    const target = goals.find((g) => g.id === id);
    if (!target) return;
    const uid = user.uid;
    const path = `users/${uid}/goals/${id}`;
    const currentValue = clampNumber(nextValue, 0, 100000, 0);
    const completed =
      typeof explicitCompleted === "boolean"
        ? explicitCompleted
        : currentValue >= target.targetValue;

    try {
      await updateDoc(doc(db, "users", uid, "goals", id), {
        currentValue,
        completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const updateGoal = async (updated: AcademicGoal) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(updated.id);
    const path = `users/${uid}/goals/${id}`;
    const targetValue = clampNumber(updated.targetValue, 1, 100000, 100);
    const currentValue = clampNumber(updated.currentValue, 0, 100000, 0);
    const completed = Boolean(updated.completed) || currentValue >= targetValue;
    const cleanTargetDate =
      updated.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(updated.targetDate.trim())
        ? updated.targetDate.trim()
        : null;

    try {
      await updateDoc(doc(db, "users", uid, "goals", id), {
        title: clampString(updated.title, 160, "Semester Goal"),
        courseCode: updated.courseCode?.trim()
          ? clampString(updated.courseCode, 32)
          : deleteField(),
        description: updated.description?.trim()
          ? clampString(updated.description, 300)
          : deleteField(),
        currentValue,
        targetValue,
        unit: clampString(updated.unit, 32, "%"),
        targetDate: cleanTargetDate ? cleanTargetDate : deleteField(),
        completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const deleteGoal = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/goals/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "goals", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  // --- Tasks CRUD ---
  const addTask = async (
    task: Omit<TodoTask, "id" | "createdAt" | "completed">
  ) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(
      `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    const path = `users/${uid}/tasks/${id}`;
    const todayISO = formatISODate(new Date());
    try {
      await setDoc(doc(db, "users", uid, "tasks", id), {
        id,
        ownerId: uid,
        title: clampString(task.title, 200, "Untitled Task"),
        category: normalizeTaskCategory(task.category),
        priority: normalizePriority(task.priority),
        dueDate: normalizeISODate(task.dueDate, todayISO),
        dueTime: normalizeHHMM(task.dueTime, "18:00"),
        estimatedMinutes: clampNumber(task.estimatedMinutes, 5, 1440, 30),
        ...(task.courseCode
          ? { courseCode: clampString(task.courseCode, 32) }
          : {}),
        ...(task.notes ? { notes: clampString(task.notes, 600) } : {}),
        completed: false,
        remindBeforeMinutes: clampNumber(task.remindBeforeMinutes, 0, 1440, 30),
        createdAt: todayISO,
        recordedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const addMultipleTasks = async (
    items: Omit<TodoTask, "id" | "createdAt" | "completed">[]
  ) => {
    if (!user || items.length === 0) return;
    const uid = user.uid;
    const todayISO = formatISODate(new Date());
    const batch = writeBatch(db);
    items.slice(0, 50).forEach((task, idx) => {
      const id = sanitizeId(`tsk-${Date.now()}-${idx}`);
      batch.set(doc(db, "users", uid, "tasks", id), {
        id,
        ownerId: uid,
        title: clampString(task.title, 200, "Untitled Task"),
        category: normalizeTaskCategory(task.category),
        priority: normalizePriority(task.priority),
        dueDate: normalizeISODate(task.dueDate, todayISO),
        dueTime: normalizeHHMM(task.dueTime, "18:00"),
        estimatedMinutes: clampNumber(task.estimatedMinutes, 5, 1440, 30),
        ...(task.courseCode
          ? { courseCode: clampString(task.courseCode, 32) }
          : {}),
        ...(task.notes ? { notes: clampString(task.notes, 600) } : {}),
        completed: false,
        remindBeforeMinutes: clampNumber(task.remindBeforeMinutes, 0, 1440, 30),
        createdAt: todayISO,
        recordedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    const path = `users/${uid}/tasks`;
    try {
      await batch.commit();
    } catch (err) {
      captureError(() => handleFirestoreError(err, OperationType.WRITE, path));
    }
  };

  const toggleTask = async (id: string) => {
    if (!user) return;
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const uid = user.uid;
    const path = `users/${uid}/tasks/${id}`;
    try {
      await updateDoc(doc(db, "users", uid, "tasks", id), {
        completed: !target.completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/tasks/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "tasks", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  // --- Classes CRUD ---
  const addClass = async (cls: Omit<StudentClass, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(
      `cls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    const days = normalizeWeekdaysList(cls.days);
    const startTime = normalizeHHMM(cls.startTime, "09:00");
    const endTime = normalizeHHMM(cls.endTime, "10:00");
    const code = clampString(cls.code, 32, "COURSE");
    const title = clampString(cls.title, 140, "Class");
    const location = clampString(cls.location, 140);
    const instructor = clampString(cls.instructor, 120);

    const batch = writeBatch(db);
    batch.set(doc(db, "users", uid, "classes", id), {
      id,
      ownerId: uid,
      code,
      title,
      days,
      startTime,
      endTime,
      location,
      instructor,
      remindMinutesBefore: clampNumber(cls.remindMinutesBefore, 0, 240, 15),
      remindersEnabled: Boolean(cls.remindersEnabled),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    days.forEach((day) => {
      const blkId = sanitizeId(`blk-${id}-${day}`);
      batch.set(doc(db, "users", uid, "scheduleBlocks", blkId), {
        id: blkId,
        ownerId: uid,
        title: clampString(`${code}: ${title}`, 180),
        day,
        startTime,
        endTime,
        category: "class",
        ...(location ? { location } : {}),
        ...(instructor ? { notes: clampString(instructor, 400) } : {}),
        sourceType: "class",
        sourceId: id,
        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/classes/${id}`)
      );
    }
  };

  const updateClass = async (updated: StudentClass) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(updated.id);
    const days = normalizeWeekdaysList(updated.days);
    const startTime = normalizeHHMM(updated.startTime, "09:00");
    const endTime = normalizeHHMM(updated.endTime, "10:00");
    const code = clampString(updated.code, 32, "COURSE");
    const title = clampString(updated.title, 140, "Class");
    const location = clampString(updated.location, 140);
    const instructor = clampString(updated.instructor, 120);

    const existingClassBlocks = scheduleBlocks.filter(
      (b) => b.sourceType === "class" && b.sourceId === id
    );
    const existingIds = new Set(existingClassBlocks.map((b) => b.id));

    const batch = writeBatch(db);
    batch.update(doc(db, "users", uid, "classes", id), {
      code,
      title,
      days,
      startTime,
      endTime,
      location,
      instructor,
      remindMinutesBefore: clampNumber(updated.remindMinutesBefore, 0, 240, 15),
      remindersEnabled: Boolean(updated.remindersEnabled),
      updatedAt: serverTimestamp(),
    });

    existingClassBlocks.forEach((b) => {
      if (!days.includes(b.day)) {
        batch.delete(doc(db, "users", uid, "scheduleBlocks", b.id));
      }
    });

    days.forEach((day) => {
      const blkId = sanitizeId(`blk-${id}-${day}`);
      const ref = doc(db, "users", uid, "scheduleBlocks", blkId);
      if (existingIds.has(blkId)) {
        batch.update(ref, {
          title: clampString(`${code}: ${title}`, 180),
          day,
          startTime,
          endTime,
          category: "class",
          location,
          notes: clampString(instructor, 400),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(ref, {
          id: blkId,
          ownerId: uid,
          title: clampString(`${code}: ${title}`, 180),
          day,
          startTime,
          endTime,
          category: "class",
          ...(location ? { location } : {}),
          ...(instructor ? { notes: clampString(instructor, 400) } : {}),
          sourceType: "class",
          sourceId: id,
          completed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    try {
      await batch.commit();
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/classes/${id}`)
      );
    }
  };

  const deleteClass = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const batch = writeBatch(db);
    batch.delete(doc(db, "users", uid, "classes", id));
    scheduleBlocks
      .filter((b) => b.sourceType === "class" && b.sourceId === id)
      .forEach((b) => {
        batch.delete(doc(db, "users", uid, "scheduleBlocks", b.id));
      });
    try {
      await batch.commit();
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/classes/${id}`)
      );
    }
  };

  const toggleClassReminder = async (id: string) => {
    if (!user) return;
    const target = classes.find((c) => c.id === id);
    if (!target) return;
    const uid = user.uid;
    const path = `users/${uid}/classes/${id}`;
    try {
      await updateDoc(doc(db, "users", uid, "classes", id), {
        remindersEnabled: !target.remindersEnabled,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  // --- Activities CRUD ---
  const addActivity = async (act: Omit<ActivityRequest, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(`act-${Date.now()}`);
    const path = `users/${uid}/activities/${id}`;
    try {
      await setDoc(doc(db, "users", uid, "activities", id), {
        id,
        ownerId: uid,
        title: clampString(act.title, 160, "Activity"),
        durationMinutes: clampNumber(act.durationMinutes, 5, 720, 60),
        frequency: clampString(act.frequency, 80, "Once"),
        preferredWindow: ["Anytime", "Morning", "Afternoon", "Evening"].includes(
          act.preferredWindow
        )
          ? act.preferredWindow
          : "Anytime",
        category: normalizeBlockCategory(act.category),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const deleteActivity = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/activities/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "activities", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  // --- Schedule Blocks CRUD ---
  const addScheduleBlock = async (block: Omit<ScheduleBlock, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(
      `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    );
    const path = `users/${uid}/scheduleBlocks/${id}`;
    try {
      await setDoc(doc(db, "users", uid, "scheduleBlocks", id), {
        id,
        ownerId: uid,
        title: clampString(block.title, 180, "Scheduled Block"),
        day: normalizeWeekday(block.day),
        startTime: normalizeHHMM(block.startTime, "09:00"),
        endTime: normalizeHHMM(block.endTime, "10:00"),
        category: normalizeBlockCategory(block.category),
        ...(block.location
          ? { location: clampString(block.location, 140) }
          : {}),
        ...(block.notes ? { notes: clampString(block.notes, 400) } : {}),
        sourceType: ["class", "task", "activity"].includes(block.sourceType)
          ? block.sourceType
          : "activity",
        ...(block.sourceId
          ? { sourceId: sanitizeId(block.sourceId) }
          : {}),
        completed: Boolean(block.completed),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const toggleBlockComplete = async (id: string) => {
    if (!user) return;
    const target = scheduleBlocks.find((b) => b.id === id);
    if (!target) return;
    const uid = user.uid;
    const path = `users/${uid}/scheduleBlocks/${id}`;
    try {
      await updateDoc(doc(db, "users", uid, "scheduleBlocks", id), {
        completed: !target.completed,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.UPDATE, path)
      );
    }
  };

  const deleteBlock = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/scheduleBlocks/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "scheduleBlocks", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  const applyGeneratedSchedule = async (
    nextBlocks: ScheduleBlock[],
    summary: string
  ) => {
    if (!user) return;
    const uid = user.uid;
    const cleanSummary = clampString(summary, 1500);
    setScheduleSummaryState(cleanSummary);

    try {
      const existingSnap = await getDocs(
        query(
          collection(db, "users", uid, "scheduleBlocks"),
          where("ownerId", "==", uid)
        )
      );

      if (!existingSnap.empty) {
        const delBatch = writeBatch(db);
        existingSnap.docs.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }

      const writeBatchOps = writeBatch(db);
      nextBlocks.slice(0, 120).forEach((blk, idx) => {
        const id = sanitizeId(
          `gen-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          "gen"
        );
        writeBatchOps.set(doc(db, "users", uid, "scheduleBlocks", id), {
          id,
          ownerId: uid,
          title: clampString(blk.title, 180, "Scheduled Block"),
          day: normalizeWeekday(blk.day),
          startTime: normalizeHHMM(blk.startTime, "09:00"),
          endTime: normalizeHHMM(blk.endTime, "10:00"),
          category: normalizeBlockCategory(blk.category),
          ...(blk.location ? { location: clampString(blk.location, 140) } : {}),
          ...(blk.notes ? { notes: clampString(blk.notes, 400) } : {}),
          sourceType: ["class", "task", "activity"].includes(blk.sourceType)
            ? blk.sourceType
            : "activity",
          ...(blk.sourceId ? { sourceId: sanitizeId(blk.sourceId) } : {}),
          completed: Boolean(blk.completed),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      writeBatchOps.update(doc(db, "users", uid, "settings", "workspace"), {
        scheduleSummary: cleanSummary,
        updatedAt: serverTimestamp(),
      });

      await writeBatchOps.commit();
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/scheduleBlocks`)
      );
    }
  };

  // --- Money & Bills CRUD ---
  const addTransaction = async (tx: Omit<Transaction, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(`tx-${Date.now()}`);
    const path = `users/${uid}/transactions/${id}`;
    try {
      await setDoc(doc(db, "users", uid, "transactions", id), {
        id,
        ownerId: uid,
        title: clampString(tx.title, 160, "Transaction"),
        amount: clampNumber(tx.amount, 0, 100000000, 0),
        type: tx.type === "income" ? "income" : "expense",
        category:
          tx.type === "income" || tx.category === "Income"
            ? "Income"
            : normalizeBudgetCategory(tx.category),
        date: normalizeISODate(tx.date, formatISODate(new Date())),
        ...(tx.notes ? { notes: clampString(tx.notes, 400) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/transactions/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "transactions", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  const addBill = async (bill: Omit<RecurringBill, "id">) => {
    if (!user) return;
    const uid = user.uid;
    const id = sanitizeId(`bill-${Date.now()}`);
    const path = `users/${uid}/bills/${id}`;
    try {
      await setDoc(doc(db, "users", uid, "bills", id), {
        id,
        ownerId: uid,
        title: clampString(bill.title, 140, "Bill"),
        amount: clampNumber(bill.amount, 0, 100000000, 0),
        dueDay: clampNumber(bill.dueDay, 1, 31, 1),
        category: normalizeBudgetCategory(bill.category),
        ...(bill.lastPaidMonth
          ? { lastPaidMonth: clampString(bill.lastPaidMonth, 7) }
          : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.CREATE, path)
      );
    }
  };

  const payBill = async (bill: RecurringBill) => {
    if (!user) return;
    const uid = user.uid;
    const monthPrefix = getCurrentMonthPrefix(new Date());
    const txId = sanitizeId(`tx-${Date.now()}`);
    const batch = writeBatch(db);
    batch.update(doc(db, "users", uid, "bills", bill.id), {
      lastPaidMonth: monthPrefix,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "users", uid, "transactions", txId), {
      id: txId,
      ownerId: uid,
      title: clampString(bill.title, 160, "Bill payment"),
      amount: clampNumber(bill.amount, 0, 100000000, 0),
      type: "expense",
      category: normalizeBudgetCategory(bill.category),
      date: formatISODate(new Date()),
      notes: "Paid recurring bill",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}/bills/${bill.id}`)
      );
    }
  };

  const deleteBill = async (id: string) => {
    if (!user) return;
    const uid = user.uid;
    const path = `users/${uid}/bills/${id}`;
    try {
      await deleteDoc(doc(db, "users", uid, "bills", id));
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.DELETE, path)
      );
    }
  };

  // --- Clear Workspace Data (preserves user's saved profile info!) ---
  const clearWorkspaceData = async () => {
    if (!user) return;
    const uid = user.uid;
    const subcols = [
      "classes",
      "tasks",
      "activities",
      "scheduleBlocks",
      "transactions",
      "bills",
      "goals",
    ] as const;

    try {
      const delBatch = writeBatch(db);
      let hasDeletes = false;
      for (const colName of subcols) {
        const snap = await getDocs(
          query(collection(db, "users", uid, colName), where("ownerId", "==", uid))
        );
        snap.docs.forEach((d) => {
          delBatch.delete(d.ref);
          hasDeletes = true;
        });
      }
      if (hasDeletes) {
        await delBatch.commit();
      }

      await updateDoc(doc(db, "users", uid, "settings", "workspace"), {
        activitiesPrompt: "",
        scheduleSummary: "",
        preferences: sanitizePreferences(DEFAULT_PREFERENCES),
        budgetLimits: sanitizeBudgetLimits(DEFAULT_BUDGET_LIMITS),
        seededDemo: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      captureError(() =>
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`)
      );
    }
  };

  return {
    user,
    authReady,
    workspaceReady,
    profile,
    classes,
    tasks,
    activitiesPrompt,
    activitiesList,
    preferences,
    scheduleBlocks,
    scheduleSummary,
    transactions,
    budgetLimits,
    bills,
    goals,
    soundEnabled,
    browserAlertsEnabled,
    saveProfile,
    handleSignOut,
    setActivitiesPrompt,
    setPreferences,
    setBudgetLimits,
    toggleSound,
    setBrowserAlerts,
    addGoal,
    updateGoalProgress,
    updateGoal,
    deleteGoal,
    addTask,
    addMultipleTasks,
    toggleTask,
    deleteTask,
    addClass,
    updateClass,
    deleteClass,
    toggleClassReminder,
    addActivity,
    deleteActivity,
    addScheduleBlock,
    toggleBlockComplete,
    deleteBlock,
    applyGeneratedSchedule,
    addTransaction,
    deleteTransaction,
    addBill,
    payBill,
    deleteBill,
    clearWorkspaceData,
  };
}
