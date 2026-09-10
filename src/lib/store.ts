import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { defaultMesaTitle } from "./money";
import {
  clampTipPercent,
  normalizeAlias,
  normalizeMesa,
  transferKey,
  type Expense,
  type FriendGroup,
  type Mesa,
  type Person,
} from "./split";

export const CREATING_MESA_KEY = "mesa-creating-id";

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // insecure context / blocked crypto
  }
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const memory = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memory.set(name, value);
    try {
      localStorage.setItem(name, value);
    } catch {
      // iframe / private mode
    }
  },
  removeItem: (name) => {
    memory.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

type MesaState = {
  mesas: Mesa[];
  groups: FriendGroup[];
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  createMesa: (groupId?: string) => string;
  updateTitle: (id: string, title: string) => void;
  deleteMesa: (id: string) => void;
  addPerson: (mesaId: string, name: string, mpAlias?: string) => void;
  updatePerson: (
    mesaId: string,
    personId: string,
    input: { name: string; mpAlias?: string },
  ) => void;
  removePerson: (mesaId: string, personId: string) => void;
  addExpense: (
    mesaId: string,
    input: {
      description: string;
      amountCents: number;
      paidBy: string;
      splitAmong: string[];
    },
  ) => void;
  updateExpense: (
    mesaId: string,
    expenseId: string,
    input: {
      description: string;
      amountCents: number;
      paidBy: string;
      splitAmong: string[];
    },
  ) => void;
  removeExpense: (mesaId: string, expenseId: string) => void;
  setTipPercent: (mesaId: string, percent: number) => void;
  togglePaidTransfer: (mesaId: string, fromId: string, toId: string) => void;
  saveGroupFromMesa: (mesaId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  getMesa: (id: string) => Mesa | undefined;
};

function patchMesa(
  mesas: Mesa[],
  id: string,
  updater: (mesa: Mesa) => Mesa,
): Mesa[] {
  return mesas.map((mesa) => (mesa.id === id ? updater(mesa) : mesa));
}

export const useMesaStore = create<MesaState>()(
  persist(
    (set, get) => ({
      mesas: [],
      groups: [],
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),

      createMesa: (groupId) => {
        const id = uid();
        const group = groupId
          ? get().groups.find((g) => g.id === groupId)
          : undefined;
        const people: Person[] = group
          ? group.people.map((person) => ({
              id: uid(),
              name: person.name,
              mpAlias: person.mpAlias,
            }))
          : [];
        const mesa: Mesa = {
          id,
          title: defaultMesaTitle(),
          createdAt: Date.now(),
          people,
          expenses: [],
          tipPercent: 0,
          paidTransfers: [],
        };
        set((state) => ({ mesas: [mesa, ...state.mesas] }));
        return id;
      },

      updateTitle: (id, title) => {
        set((state) => ({
          mesas: patchMesa(state.mesas, id, (mesa) => ({ ...mesa, title })),
        }));
      },

      deleteMesa: (id) => {
        set((state) => ({ mesas: state.mesas.filter((m) => m.id !== id) }));
      },

      addPerson: (mesaId, name, mpAlias) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const alias = normalizeAlias(mpAlias ?? "");
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => {
            const exists = mesa.people.some(
              (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
            );
            if (exists) return mesa;
            const person: Person = { id: uid(), name: trimmed, mpAlias: alias };
            return { ...mesa, people: [...mesa.people, person] };
          }),
        }));
      },

      updatePerson: (mesaId, personId, input) => {
        const name = input.name.trim();
        if (!name) return;
        const alias = normalizeAlias(input.mpAlias ?? "");
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => ({
            ...mesa,
            people: mesa.people.map((person) =>
              person.id === personId
                ? { ...person, name, mpAlias: alias }
                : person,
            ),
          })),
        }));
      },

      removePerson: (mesaId, personId) => {
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => ({
            ...mesa,
            people: mesa.people.filter((p) => p.id !== personId),
            expenses: mesa.expenses
              .map((e) => ({
                ...e,
                splitAmong: e.splitAmong.filter((id) => id !== personId),
              }))
              .filter((e) => e.paidBy !== personId && e.splitAmong.length > 0),
          })),
        }));
      },

      addExpense: (mesaId, input) => {
        if (input.amountCents <= 0 || input.splitAmong.length === 0) return;
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => {
            const expense: Expense = {
              id: uid(),
              description: input.description.trim() || "Gasto",
              amountCents: input.amountCents,
              paidBy: input.paidBy,
              splitAmong: input.splitAmong,
              createdAt: Date.now(),
            };
            return { ...mesa, expenses: [expense, ...mesa.expenses] };
          }),
        }));
      },

      updateExpense: (mesaId, expenseId, input) => {
        if (input.amountCents <= 0 || input.splitAmong.length === 0) return;
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => ({
            ...mesa,
            expenses: mesa.expenses.map((e) =>
              e.id === expenseId
                ? {
                    ...e,
                    description: input.description.trim() || "Gasto",
                    amountCents: input.amountCents,
                    paidBy: input.paidBy,
                    splitAmong: input.splitAmong,
                  }
                : e,
            ),
          })),
        }));
      },

      removeExpense: (mesaId, expenseId) => {
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => ({
            ...mesa,
            expenses: mesa.expenses.filter((e) => e.id !== expenseId),
          })),
        }));
      },

      getMesa: (id) => get().mesas.find((m) => m.id === id),

      setTipPercent: (mesaId, percent) => {
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => ({
            ...mesa,
            tipPercent: clampTipPercent(percent),
          })),
        }));
      },

      togglePaidTransfer: (mesaId, fromId, toId) => {
        const key = transferKey(fromId, toId);
        set((state) => ({
          mesas: patchMesa(state.mesas, mesaId, (mesa) => {
            const current = mesa.paidTransfers ?? [];
            const paid = current.includes(key)
              ? current.filter((item) => item !== key)
              : [...current, key];
            return { ...mesa, paidTransfers: paid };
          }),
        }));
      },

      saveGroupFromMesa: (mesaId, name) => {
        const mesa = get().mesas.find((item) => item.id === mesaId);
        if (!mesa || mesa.people.length === 0) return;
        const label = name.trim() || "Grupo";
        const people = mesa.people.map((person) => ({
          name: person.name,
          mpAlias: person.mpAlias,
        }));
        set((state) => {
          const existing = state.groups.find(
            (group) => group.name.toLowerCase() === label.toLowerCase(),
          );
          if (existing) {
            return {
              groups: state.groups.map((group) =>
                group.id === existing.id ? { ...group, people } : group,
              ),
            };
          }
          const group: FriendGroup = { id: uid(), name: label, people };
          return { groups: [group, ...state.groups] };
        });
      },

      deleteGroup: (groupId) => {
        set((state) => ({
          groups: state.groups.filter((group) => group.id !== groupId),
        }));
      },
    }),
    {
      name: "mesa-store",
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({ mesas: state.mesas, groups: state.groups }),
      migrate: (persisted) => {
        const raw = (persisted ?? {}) as {
          mesas?: Mesa[];
          groups?: FriendGroup[];
        };
        return {
          mesas: (raw.mesas ?? []).map(normalizeMesa),
          groups: raw.groups ?? [],
        };
      },
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as {
          mesas?: Mesa[];
          groups?: FriendGroup[];
        };
        return {
          ...current,
          mesas: (raw.mesas ?? []).map(normalizeMesa),
          groups: raw.groups ?? [],
        };
      },
    },
  ),
);
