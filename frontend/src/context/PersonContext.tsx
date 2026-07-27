import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Person } from '../types';
import { personsApi } from '../api/client';

const STORAGE_KEY = 'calories.activePersonId';

interface PersonContextValue {
  persons: Person[];
  activePerson: Person | null;
  loading: boolean;
  setActivePersonId: (id: string) => void;
  createPerson: (name: string) => Promise<Person>;
  refreshPersons: () => Promise<void>;
  updateActivePersonTargets: (targets: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fiber_g: number;
  }) => Promise<void>;
}

const PersonContext = createContext<PersonContextValue | undefined>(undefined);

export function PersonProvider({ children }: { children: ReactNode }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [activePersonId, setActivePersonIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refreshPersons = useCallback(async () => {
    const list = await personsApi.list();
    setPersons(list);
    return;
  }, []);

  useEffect(() => {
    refreshPersons().finally(() => setLoading(false));
  }, [refreshPersons]);

  useEffect(() => {
    // Once persons are loaded, make sure there is a valid active selection.
    if (persons.length === 0) return;
    const stillExists = persons.some((p) => p.id === activePersonId);
    if (!stillExists) {
      setActivePersonIdState(persons[0].id);
    }
  }, [persons, activePersonId]);

  const setActivePersonId = useCallback((id: string) => {
    setActivePersonIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const createPerson = useCallback(
    async (name: string) => {
      const person = await personsApi.create(name);
      await refreshPersons();
      setActivePersonId(person.id);
      return person;
    },
    [refreshPersons, setActivePersonId]
  );

  const updateActivePersonTargets = useCallback(
    async (targets: { calories: number; carbs_g: number; protein_g: number; fiber_g: number }) => {
      if (!activePersonId) return;
      await personsApi.updateTargets(activePersonId, targets);
      await refreshPersons();
    },
    [activePersonId, refreshPersons]
  );

  const activePerson = useMemo(
    () => persons.find((p) => p.id === activePersonId) ?? null,
    [persons, activePersonId]
  );

  const value: PersonContextValue = {
    persons,
    activePerson,
    loading,
    setActivePersonId,
    createPerson,
    refreshPersons,
    updateActivePersonTargets,
  };

  return <PersonContext.Provider value={value}>{children}</PersonContext.Provider>;
}

export function usePersonContext() {
  const ctx = useContext(PersonContext);
  if (!ctx) throw new Error('usePersonContext must be used within a PersonProvider');
  return ctx;
}
