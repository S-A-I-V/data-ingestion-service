/**
 * useUndoRedo — Classic two-stack undo/redo for any serializable state.
 *
 * How it works:
 *   - Maintains a "present" state plus two stacks (past[] and future[])
 *   - `set(newState)` → pushes present to past, clears future, sets new present
 *   - `undo()` → pushes present to future, pops past into present
 *   - `redo()` → pushes present to past, pops future into present
 *
 * This is the standard approach used by Redux-Undo and similar libraries.
 * No closures, no refs, no debouncing — pure state machine.
 */

import { useCallback, useState } from "react";

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory = 50) {
  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Set new state (user action)
  const set = useCallback(
    (newPresent: T) => {
      setState((prev) => {
        const newPast = [...prev.past, prev.present];
        if (newPast.length > maxHistory) newPast.shift();
        return {
          past: newPast,
          present: newPresent,
          future: [],
        };
      });
    },
    [maxHistory],
  );

  // Undo
  const undo = useCallback(() => {
    setState((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const previousState = newPast.pop()!;
      const newFuture = [prev.present, ...prev.future];
      return {
        past: newPast,
        present: previousState,
        future: newFuture,
      };
    });
  }, []);

  // Redo
  const redo = useCallback(() => {
    setState((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const nextState = newFuture.shift()!;
      const newPast = [...prev.past, prev.present];
      return {
        past: newPast,
        present: nextState,
        future: newFuture,
      };
    });
  }, []);

  // Reset (e.g., when loading new data)
  const reset = useCallback((newPresent: T) => {
    setState({
      past: [],
      present: newPresent,
      future: [],
    });
  }, []);

  return {
    state: state.present,
    set,
    undo,
    redo,
    reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
