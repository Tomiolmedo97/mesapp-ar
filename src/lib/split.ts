export type Person = {
  id: string;
  name: string;
  mpAlias?: string;
};

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  paidBy: string;
  splitAmong: string[];
  createdAt: number;
};

export type Mesa = {
  id: string;
  title: string;
  createdAt: number;
  people: Person[];
  expenses: Expense[];
  tipPercent: number;
  paidTransfers: string[];
};

export type FriendGroup = {
  id: string;
  name: string;
  people: { name: string; mpAlias?: string }[];
};

export type Transfer = {
  fromId: string;
  toId: string;
  amountCents: number;
};

export type PersonSummary = {
  id: string;
  paidCents: number;
  consumedCents: number;
  netCents: number;
};

const EPS = 1;

export function normalizeMesa(mesa: Mesa): Mesa {
  return {
    ...mesa,
    tipPercent: Number.isFinite(mesa.tipPercent) ? mesa.tipPercent : 0,
    paidTransfers: Array.isArray(mesa.paidTransfers) ? mesa.paidTransfers : [],
    people: mesa.people.map((person) => ({
      ...person,
      mpAlias: person.mpAlias?.trim() || undefined,
    })),
  };
}

export function clampTipPercent(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(30, Math.round(value * 10) / 10);
}

export function applyTip(cents: number, percent: number): number {
  const tip = clampTipPercent(percent);
  if (tip <= 0) return cents;
  return Math.round((cents * (100 + tip)) / 100);
}

export function normalizeAlias(raw: string): string | undefined {
  const trimmed = raw.trim().replace(/^@+/, "");
  return trimmed ? trimmed : undefined;
}

function splitGrain(mesa: Mesa): number {
  if (mesa.expenses.length === 0) return 1;
  const percent = clampTipPercent(mesa.tipPercent);
  const allWhole = mesa.expenses.every((e) => {
    const amount = applyTip(e.amountCents, percent);
    return amount % 100 === 0;
  });
  return allWhole ? 100 : 1;
}

export function subtotalCents(mesa: Mesa): number {
  return mesa.expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

export function totalCents(mesa: Mesa): number {
  const percent = clampTipPercent(mesa.tipPercent);
  return mesa.expenses.reduce(
    (sum, e) => sum + applyTip(e.amountCents, percent),
    0,
  );
}

export function tipCents(mesa: Mesa): number {
  return totalCents(mesa) - subtotalCents(mesa);
}

type AllocatedExpense = {
  expense: Expense;
  amountCents: number;
  shares: Map<string, number>;
};

function allocateExpenses(mesa: Mesa): AllocatedExpense[] {
  const grain = splitGrain(mesa);
  const percent = clampTipPercent(mesa.tipPercent);
  const known = new Set(mesa.people.map((person) => person.id));

  return mesa.expenses.map((expense) => {
    const amountCents = applyTip(expense.amountCents, percent);
    const shares = new Map<string, number>();
    if (amountCents <= 0) return { expense, amountCents, shares };

    const among = expense.splitAmong.filter((id) => known.has(id));
    if (among.length === 0) return { expense, amountCents, shares };

    const units = Math.round(amountCents / grain);
    const share = Math.floor(units / among.length);
    const remainder = units - share * among.length;
    among.forEach((id, i) => {
      const extra = i < remainder ? 1 : 0;
      shares.set(id, (share + extra) * grain);
    });
    return { expense, amountCents, shares };
  });
}

export type LineShare = {
  expenseId: string;
  description: string;
  paidById: string;
  shareCents: number;
  totalCents: number;
  among: number;
};

export type PaidLine = {
  expenseId: string;
  description: string;
  amountCents: number;
};

export type PersonBreakdown = {
  id: string;
  paidCents: number;
  consumedCents: number;
  netCents: number;
  consumed: LineShare[];
  paid: PaidLine[];
};

export function personBreakdown(mesa: Mesa, personId: string): PersonBreakdown {
  const allocated = allocateExpenses(mesa);
  const consumed: LineShare[] = [];
  const paid: PaidLine[] = [];
  let consumedCents = 0;
  let paidCents = 0;

  for (const row of allocated) {
    const share = row.shares.get(personId) ?? 0;
    if (share > 0) {
      consumed.push({
        expenseId: row.expense.id,
        description: row.expense.description.trim() || "Gasto",
        paidById: row.expense.paidBy,
        shareCents: share,
        totalCents: row.amountCents,
        among: row.shares.size,
      });
      consumedCents += share;
    }
    if (row.expense.paidBy === personId && row.amountCents > 0) {
      paid.push({
        expenseId: row.expense.id,
        description: row.expense.description.trim() || "Gasto",
        amountCents: row.amountCents,
      });
      paidCents += row.amountCents;
    }
  }

  return {
    id: personId,
    paidCents,
    consumedCents,
    netCents: paidCents - consumedCents,
    consumed,
    paid,
  };
}

export function explainTransfer(mesa: Mesa, transfer: Transfer): {
  from: PersonBreakdown;
  to: PersonBreakdown;
  othersFrom: Transfer[];
} {
  const from = personBreakdown(mesa, transfer.fromId);
  const to = personBreakdown(mesa, transfer.toId);
  const othersFrom = settle(mesa).filter(
    (item) =>
      item.fromId === transfer.fromId &&
      (item.toId !== transfer.toId || item.amountCents !== transfer.amountCents),
  );
  return { from, to, othersFrom };
}

export function personSummaries(mesa: Mesa): PersonSummary[] {
  return mesa.people.map((person) => {
    const row = personBreakdown(mesa, person.id);
    return {
      id: person.id,
      paidCents: row.paidCents,
      consumedCents: row.consumedCents,
      netCents: row.netCents,
    };
  });
}

/** Positive = others owe this person. Negative = this person owes. */
export function netBalances(mesa: Mesa): Map<string, number> {
  const bal = new Map<string, number>();
  for (const row of personSummaries(mesa)) bal.set(row.id, row.netCents);
  return bal;
}

export function settle(mesa: Mesa): Transfer[] {
  const balances = netBalances(mesa);
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, value] of balances) {
    if (value <= -EPS) debtors.push({ id, amount: -value });
    else if (value >= EPS) creditors.push({ id, amount: value });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    if (pay >= EPS) {
      transfers.push({
        fromId: debtors[i].id,
        toId: creditors[j].id,
        amountCents: pay,
      });
    }
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < EPS) i += 1;
    if (creditors[j].amount < EPS) j += 1;
  }

  return transfers;
}

export function transferKey(fromId: string, toId: string): string {
  return `${fromId}:${toId}`;
}

export function isTransferPaid(mesa: Mesa, transfer: Transfer): boolean {
  return (mesa.paidTransfers ?? []).includes(
    transferKey(transfer.fromId, transfer.toId),
  );
}

export function unpaidTransfers(mesa: Mesa): Transfer[] {
  return settle(mesa).filter((transfer) => !isTransferPaid(mesa, transfer));
}

export function personById(mesa: Mesa, id: string): Person | undefined {
  return mesa.people.find((p) => p.id === id);
}

export function equalShareCents(mesa: Mesa): number | null {
  if (mesa.people.length === 0) return null;
  const grain = splitGrain(mesa);
  return Math.round(totalCents(mesa) / mesa.people.length / grain) * grain;
}

export function buildShareText(mesa: Mesa): string {
  const lines: string[] = [];
  lines.push(`Mesa · ${mesa.title}`);
  lines.push(formatShareDate(mesa.createdAt));
  lines.push("");

  if (mesa.people.length) {
    lines.push("Personas");
    for (const person of mesa.people) {
      lines.push(
        person.mpAlias
          ? `· ${person.name} · ${person.mpAlias}`
          : `· ${person.name}`,
      );
    }
    lines.push("");
  }

  if (mesa.expenses.length) {
    lines.push("Gastos");
    for (const expense of mesa.expenses) {
      const payer = personById(mesa, expense.paidBy)?.name ?? "alguien";
      const desc = expense.description.trim() || "Gasto";
      lines.push(`· ${desc} — ${fmt(expense.amountCents)} (pagó ${payer})`);
    }
    const tip = tipCents(mesa);
    const percent = clampTipPercent(mesa.tipPercent);
    if (tip > 0) {
      lines.push(`Propina ${formatTipPercent(percent)}  ${fmt(tip)}`);
    }
    lines.push(`Total  ${fmt(totalCents(mesa))}`);
    lines.push("");
  }

  const summaries = personSummaries(mesa).filter(
    (row) => row.paidCents > 0 || row.consumedCents > 0,
  );
  if (summaries.length) {
    lines.push("Por persona");
    for (const row of summaries) {
      const person = personById(mesa, row.id);
      if (!person) continue;
      if (row.netCents > EPS) {
        lines.push(
          `· ${person.name}  pagó ${fmt(row.paidCents)}  le deben ${fmt(row.netCents)}`,
        );
      } else if (row.netCents < -EPS) {
        lines.push(
          `· ${person.name}  pagó ${fmt(row.paidCents)}  debe ${fmt(-row.netCents)}`,
        );
      } else {
        lines.push(`· ${person.name}  pagó ${fmt(row.paidCents)}  en cero`);
      }
    }
    lines.push("");
  }

  const transfers = settle(mesa);
  const open = transfers.filter((t) => !isTransferPaid(mesa, t));
  const paid = transfers.filter((t) => isTransferPaid(mesa, t));

  if (transfers.length === 0) {
    lines.push(
      mesa.expenses.length
        ? "Cuentas saldadas. Nadie se debe nada."
        : "Todavía no hay gastos.",
    );
  } else if (open.length === 0) {
    lines.push("Cuentas saldadas. Ya está todo pagado.");
  } else {
    lines.push("Manden");
    for (const t of open) {
      const from = personById(mesa, t.fromId)?.name ?? "Alguien";
      const to = personById(mesa, t.toId);
      const alias = to?.mpAlias;
      lines.push(`· ${from} le debe ${fmt(t.amountCents)} a ${to?.name ?? "alguien"}`);
      if (alias) lines.push(`  MP: ${alias}`);
    }
  }

  if (paid.length) {
    lines.push("");
    lines.push("Ya pagado");
    for (const t of paid) {
      const from = personById(mesa, t.fromId)?.name ?? "Alguien";
      const to = personById(mesa, t.toId)?.name ?? "alguien";
      lines.push(`· ${from} → ${to}  ${fmt(t.amountCents)}`);
    }
  }

  return lines.join("\n");
}

export function formatTipPercent(percent: number): string {
  const value = clampTipPercent(percent);
  return Number.isInteger(value) ? `${value}%` : `${value}%`.replace(".", ",");
}

function fmt(cents: number): string {
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `$${formatted}`;
}

function formatShareDate(ts: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(ts));
}
