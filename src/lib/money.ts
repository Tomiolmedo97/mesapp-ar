/** Integer cents. Avoids float drift on restaurant bills. */

export function parseAmountToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/^\$/, "");
  if (!trimmed) return null;

  let normalized = trimmed;
  const lastComma = trimmed.lastIndexOf(",");
  const lastDot = trimmed.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = trimmed.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = trimmed.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    const decimals = trimmed.length - lastComma - 1;
    normalized =
      decimals <= 2 ? trimmed.replace(",", ".") : trimmed.replace(/,/g, "");
  } else if (lastDot !== -1) {
    const decimals = trimmed.length - lastDot - 1;
    normalized =
      decimals <= 2 ? trimmed : trimmed.replace(/\./g, "");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function formatCents(
  cents: number,
  options: { withSymbol?: boolean } = {},
): string {
  const { withSymbol = true } = options;
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return withSymbol ? `$${formatted}` : formatted;
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ts));
}

export function defaultMesaTitle(date = new Date()): string {
  const hour = date.getHours();
  const meal =
    hour < 5 ? "After" : hour < 11 ? "Desayuno" : hour < 16 ? "Almuerzo" : hour < 22 ? "Cena" : "After";
  const weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" }).format(
    date,
  );
  return `${meal} del ${weekday}`;
}
