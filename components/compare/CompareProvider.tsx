"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

interface CompareContextType {
  selectedIds: number[];
  addMovie: (id: number) => void;
  removeMovie: (id: number) => void;
  clearAll: () => void;
  isSelected: (id: number) => boolean;
  canAddMore: boolean;
  count: number;
}

const MAX_COMPARE = 5;

const CompareContext = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const addMovie = useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (prev.length >= MAX_COMPARE || prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const removeMovie = useCallback((id: number) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const isSelected = useCallback(
    (id: number) => selectedIds.includes(id),
    [selectedIds]
  );

  const value = useMemo(
    () => ({
      selectedIds,
      addMovie,
      removeMovie,
      clearAll,
      isSelected,
      canAddMore: selectedIds.length < MAX_COMPARE,
      count: selectedIds.length,
    }),
    [selectedIds, addMovie, removeMovie, clearAll, isSelected]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return context;
}
