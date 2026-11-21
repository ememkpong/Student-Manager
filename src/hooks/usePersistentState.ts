import { useEffect, useState } from "react";

export function usePersistentState<T>(
  storageKey: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved) as T;
      }
    } catch {
      // Fallback to initial value if storage is unavailable or corrupted
    }
    return typeof initialValue === "function"
      ? (initialValue as () => T)()
      : initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore quota errors cleanly
    }
  }, [storageKey, state]);

  return [state, setState];
}
