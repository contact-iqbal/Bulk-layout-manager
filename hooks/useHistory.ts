import { useState, useCallback } from "react";

interface HistoryItem<T> {
  state: T;
  action: string;
}

interface useHistoryResult<T> {
  state: T;
  set: (newPresent: T, action?: string) => void;
  undo: () => void;
  redo: () => void;
  reset: (past: HistoryItem<T>[], present: T, future: HistoryItem<T>[]) => void;
  canUndo: boolean;
  canRedo: boolean;
  history: {
    past: HistoryItem<T>[];
    present: T;
    future: HistoryItem<T>[];
  };
}

export default function useHistory<T>(initialState: T): useHistoryResult<T> {
  const [past, setPast] = useState<HistoryItem<T>[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<HistoryItem<T>[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!past || past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture([{ state: present, action: previous.action }, ...future]);
    setPresent(previous.state);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (!future || future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, { state: present, action: next.action }]);
    setPresent(next.state);
    setFuture(newFuture);
  }, [past, present, future]);

  const set = useCallback(
    (newPresent: T, action: string = "Action") => {
      setPast([...past, { state: present, action }]);
      setPresent(newPresent);
      setFuture([]);
    },
    [past, present],
  );

  const reset = useCallback(
    (newPast: HistoryItem<T>[], newPresent: T, newFuture: HistoryItem<T>[]) => {
      setPast(newPast || []);
      setPresent(newPresent);
      setFuture(newFuture || []);
    },
    [],
  );

  return {
    state: present,
    set,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    history: { past, present, future },
  };
}
