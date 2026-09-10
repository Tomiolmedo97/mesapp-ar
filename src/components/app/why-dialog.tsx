import { PersonAvatar } from "@/components/app/person-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";
import {
  explainTransfer,
  personBreakdown,
  personById,
  settle,
  type Mesa,
  type PersonBreakdown,
  type Transfer,
} from "@/lib/split";

type WhyDialogProps = {
  mesa: Mesa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer?: Transfer | null;
  personId?: string | null;
};

export function WhyDialog({
  mesa,
  open,
  onOpenChange,
  transfer,
  personId,
}: WhyDialogProps) {
  const person = personId ? personById(mesa, personId) : undefined;
  const from = transfer ? personById(mesa, transfer.fromId) : undefined;
  const to = transfer ? personById(mesa, transfer.toId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl border-border bg-card">
        {transfer && from && to ? (
          <TransferWhy mesa={mesa} transfer={transfer} />
        ) : person ? (
          <PersonWhy mesa={mesa} personId={person.id} />
        ) : (
          <DialogHeader>
            <DialogTitle>Detalle</DialogTitle>
            <DialogDescription>No hay nada para mostrar.</DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferWhy({ mesa, transfer }: { mesa: Mesa; transfer: Transfer }) {
  const from = personById(mesa, transfer.fromId);
  const to = personById(mesa, transfer.toId);
  if (!from || !to) return null;
  const { from: fromRow, to: toRow, othersFrom } = explainTransfer(
    mesa,
    transfer,
  );

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-medium tracking-tight">
          {from.name} le debe a {to.name}
        </DialogTitle>
        <p className="font-display text-3xl leading-none font-medium tracking-tight text-foreground tabular-nums">
          {formatCents(transfer.amountCents)}
        </p>
        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
          {whyCopy(mesa, transfer, fromRow, toRow, othersFrom)}
        </DialogDescription>
      </DialogHeader>

      <Ledger title={from.name} id={from.id} row={fromRow} mesa={mesa} />
      <Ledger title={to.name} id={to.id} row={toRow} mesa={mesa} />
    </div>
  );
}

function PersonWhy({ mesa, personId }: { mesa: Mesa; personId: string }) {
  const person = personById(mesa, personId);
  if (!person) return null;
  const row = personBreakdown(mesa, personId);
  const related = settle(mesa).filter(
    (item) => item.fromId === personId || item.toId === personId,
  );

  return (
    <div className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-medium tracking-tight">
          {person.name}
        </DialogTitle>
        <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
          {personBalanceCopy(person.name, row)}
        </DialogDescription>
      </DialogHeader>

      <Ledger title={person.name} id={person.id} row={row} mesa={mesa} />

      {related.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Movimientos
          </p>
          <ul className="flex flex-col overflow-hidden rounded-2xl bg-background shadow-[var(--shadow-border)]">
            {related.map((item) => {
              const otherId = item.fromId === personId ? item.toId : item.fromId;
              const other = personById(mesa, otherId);
              if (!other) return null;
              const outgoing = item.fromId === personId;
              return (
                <li
                  key={`${item.fromId}-${item.toId}`}
                  className="flex items-center justify-between gap-3 px-3 py-3 text-sm"
                >
                  <span className="min-w-0 truncate text-foreground">
                    {outgoing ? `Le transfiere a ${other.name}` : `Recibe de ${other.name}`}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">
                    {formatCents(item.amountCents)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Ledger({
  title,
  id,
  row,
  mesa,
}: {
  title: string;
  id: string;
  row: PersonBreakdown;
  mesa: Mesa;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PersonAvatar id={id} name={title} size="sm" />
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {title}
        </p>
      </div>
      <ul className="flex flex-col overflow-hidden rounded-2xl bg-background shadow-[var(--shadow-border)]">
        {row.consumed.length > 0 ? (
          <li className="px-3 pt-2.5 pb-1 text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Le tocaba
          </li>
        ) : null}
        {row.consumed.map((line) => {
          const payer = personById(mesa, line.paidById)?.name ?? "alguien";
          return (
            <li
              key={`c-${line.expenseId}`}
              className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-foreground">
                {line.description}
                <span className="text-muted-foreground">
                  {` · pagó ${payer}`}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                {formatCents(line.shareCents)}
              </span>
            </li>
          );
        })}
        {row.paid.length > 0 ? (
          <li className="border-t border-border px-3 pt-2.5 pb-1 text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Pagó
          </li>
        ) : (
          <li className="flex items-baseline justify-between gap-3 border-t border-border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Pagó</span>
            <span className="tabular-nums text-foreground">$0</span>
          </li>
        )}
        {row.paid.map((line) => (
          <li
            key={`p-${line.expenseId}`}
            className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm"
          >
            <span className="min-w-0 truncate text-foreground">
              {line.description}
            </span>
            <span className="shrink-0 tabular-nums text-foreground">
              {formatCents(line.amountCents)}
            </span>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-3 border-t border-border px-3 py-2.5 text-sm">
          <span className="text-foreground">
            {row.netCents > 1
              ? "Le deben"
              : row.netCents < -1
                ? "Debe"
                : "Saldo"}
          </span>
          <span className="tabular-nums font-medium text-foreground">
            {formatCents(Math.abs(row.netCents))}
          </span>
        </li>
      </ul>
    </section>
  );
}

function whyCopy(
  mesa: Mesa,
  transfer: Transfer,
  fromRow: PersonBreakdown,
  toRow: PersonBreakdown,
  othersFrom: Transfer[],
): string {
  const from = personById(mesa, transfer.fromId)?.name ?? "Alguien";
  const to = personById(mesa, transfer.toId)?.name ?? "alguien";
  const fromPaid = fromRow.paidCents;
  const fromConsumed = fromRow.consumedCents;
  const fromOwes = Math.abs(Math.min(0, fromRow.netCents));
  const toPaid = toRow.paidCents;
  const toConsumed = toRow.consumedCents;
  const toOwed = Math.max(0, toRow.netCents);

  const fromPart =
    fromPaid === 0
      ? `${from} no pagó nada y le correspondían ${formatCents(fromConsumed)}, así que debe ${formatCents(fromOwes)}.`
      : `${from} pagó ${formatCents(fromPaid)} y le correspondían ${formatCents(fromConsumed)}. Le faltan ${formatCents(fromOwes)}.`;

  const toPart =
    toConsumed === 0
      ? `${to} adelantó ${formatCents(toPaid)} y no le correspondía nada de eso.`
      : `${to} pagó ${formatCents(toPaid)} cuando le tocaban ${formatCents(toConsumed)}, así que le deben ${formatCents(toOwed)}.`;

  const close =
    othersFrom.length === 0
      ? `Con esta transferencia de ${formatCents(transfer.amountCents)}, ${from} queda en cero.`
      : `De lo que debe, ${formatCents(transfer.amountCents)} van a ${to}${othersFrom
          .map((item) => {
            const name = personById(mesa, item.toId)?.name ?? "alguien";
            return ` y ${formatCents(item.amountCents)} a ${name}`;
          })
          .join("")}.`;

  return `${fromPart} ${toPart} ${close}`;
}

function personBalanceCopy(name: string, row: PersonBreakdown): string {
  if (row.netCents > 1) {
    return `${name} pagó ${formatCents(row.paidCents)} y le correspondían ${formatCents(row.consumedCents)}. Le deben ${formatCents(row.netCents)}.`;
  }
  if (row.netCents < -1) {
    return `${name} pagó ${formatCents(row.paidCents)} y le correspondían ${formatCents(row.consumedCents)}. Debe ${formatCents(-row.netCents)}.`;
  }
  return `${name} pagó justo lo que le correspondía.`;
}
