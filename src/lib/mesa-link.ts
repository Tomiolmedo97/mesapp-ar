import { clampTipPercent, normalizeMesa, type Mesa } from "@/lib/split";

const MAX_TOKEN = 6000;
const MAX_PEOPLE = 24;
const MAX_EXPENSES = 60;

type Packed = {
  v: 1;
  t: string;
  c: number;
  p: number;
  n: string[][];
  e: Array<[string, number, number, number[]]>;
  d: number[][];
};

function bytesToB64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlToBytes(token: string): Uint8Array {
  const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4));
  const binary = atob(token.replaceAll("-", "+").replaceAll("_", "/") + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

export function encodeMesaToken(mesa: Mesa): string | null {
  if (mesa.people.length === 0 || mesa.people.length > MAX_PEOPLE) return null;
  if (mesa.expenses.length > MAX_EXPENSES) return null;

  const index = new Map(mesa.people.map((person, i) => [person.id, i]));
  const expenses: Packed["e"] = [];
  for (const expense of mesa.expenses) {
    const payer = index.get(expense.paidBy);
    if (payer === undefined) continue;
    const among = [
      ...new Set(
        expense.splitAmong
          .map((id) => index.get(id))
          .filter((i): i is number => i !== undefined),
      ),
    ];
    if (among.length === 0) continue;
    if (!Number.isInteger(expense.amountCents) || expense.amountCents < 0) continue;
    expenses.push([
      clip(expense.description, 80) || "Gasto",
      expense.amountCents,
      payer,
      among,
    ]);
  }

  const paid: Packed["d"] = [];
  for (const key of mesa.paidTransfers ?? []) {
    const [fromId, toId] = key.split(":");
    const from = index.get(fromId ?? "");
    const to = index.get(toId ?? "");
    if (from === undefined || to === undefined || from === to) continue;
    paid.push([from, to]);
  }

  const packed: Packed = {
    v: 1,
    t: clip(mesa.title, 80) || "Mesa",
    c: Number.isFinite(mesa.createdAt) ? mesa.createdAt : Date.now(),
    p: clampTipPercent(mesa.tipPercent),
    n: mesa.people.map((person) => {
      const name = clip(person.name, 40) || "Alguien";
      const alias = person.mpAlias ? clip(person.mpAlias, 32) : "";
      return alias ? [name, alias] : [name];
    }),
    e: expenses,
    d: paid,
  };

  const token = bytesToB64url(new TextEncoder().encode(JSON.stringify(packed)));
  return token.length <= MAX_TOKEN ? token : null;
}

function isIndex(value: unknown, length: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < length;
}

export function decodeMesaToken(token: string): Mesa | null {
  if (!token || token.length > MAX_TOKEN || !/^[A-Za-z0-9_-]+$/.test(token)) {
    return null;
  }

  let packed: Packed;
  try {
    packed = JSON.parse(new TextDecoder().decode(b64urlToBytes(token))) as Packed;
  } catch {
    return null;
  }

  if (!packed || packed.v !== 1 || !Array.isArray(packed.n) || !Array.isArray(packed.e)) {
    return null;
  }
  if (packed.n.length === 0 || packed.n.length > MAX_PEOPLE) return null;
  if (packed.e.length > MAX_EXPENSES) return null;

  const people = packed.n.map((row, i) => {
    if (!Array.isArray(row) || typeof row[0] !== "string") return null;
    const name = clip(row[0], 40);
    if (!name) return null;
    const alias = typeof row[1] === "string" ? clip(row[1], 32) : "";
    return { id: String(i), name, mpAlias: alias || undefined };
  });
  if (people.some((person) => !person)) return null;

  const count = people.length;
  const expenses = packed.e.map((row, i) => {
    if (!Array.isArray(row) || row.length < 4) return null;
    const [description, amountCents, payer, among] = row;
    if (typeof description !== "string") return null;
    if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > 100_000_000_00) {
      return null;
    }
    if (!isIndex(payer, count) || !Array.isArray(among) || among.length === 0) return null;
    const splitAmong = [...new Set(among.filter((id) => isIndex(id, count)))].map(String);
    if (splitAmong.length === 0) return null;
    return {
      id: `e${i}`,
      description: clip(description, 80) || "Gasto",
      amountCents,
      paidBy: String(payer),
      splitAmong,
      createdAt: packed.c,
    };
  });
  if (expenses.some((expense) => !expense)) return null;

  const paidTransfers = Array.isArray(packed.d)
    ? packed.d.flatMap((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return [];
        const [from, to] = pair;
        if (!isIndex(from, count) || !isIndex(to, count) || from === to) return [];
        return [`${from}:${to}`];
      })
    : [];

  return normalizeMesa({
    id: "shared",
    title: typeof packed.t === "string" ? clip(packed.t, 80) || "Mesa" : "Mesa",
    createdAt: Number.isFinite(packed.c) ? packed.c : Date.now(),
    people: people as Mesa["people"],
    expenses: expenses as Mesa["expenses"],
    tipPercent: clampTipPercent(Number(packed.p)),
    paidTransfers,
  });
}

export function mesaShareUrl(mesa: Mesa, origin: string): string | null {
  const token = encodeMesaToken(mesa);
  if (!token || !origin) return null;
  return `${origin.replace(/\/$/, "")}/m/${token}`;
}
