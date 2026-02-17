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
    if (!canUndo) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);

    setPast(newPast);
    setFuture([{ state: present, action: previous.action }, ...future]);
    setPresent(previous.state);
  }, [past, present, future, canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, { state: present, action: next.action }]);
    setPresent(next.state);
    setFuture(newFuture);
  }, [past, present, future, canRedo]);

  const set = useCallback(
    (newPresent: T, action: string = "Action") => {
      setPast([...past, { state: present, action }]);
      setPresent(newPresent);
      setFuture([]);
    },
    [past, present],
  );

  return {
    state: present,
    set,
    undo,
    redo,
    canUndo,
    canRedo,
    history: { past, present, future },
  };
}
