import { useEffect, useState } from "react";
import { Check, ChevronRight, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PersonAvatar } from "@/components/app/person-avatar";
import { WhyDialog } from "@/components/app/why-dialog";
import { copyText } from "@/lib/clipboard";
import { formatCents } from "@/lib/money";
import {
  buildShareText,
  clampTipPercent,
  formatTipPercent,
  isTransferPaid,
  personById,
  personSummaries,
  settle,
  subtotalCents,
  tipCents,
  totalCents,
  type Mesa,
  type Transfer,
} from "@/lib/split";
import { useMesaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SettlementCard({ mesa }: { mesa: Mesa }) {
  const setTipPercent = useMesaStore((s) => s.setTipPercent);
  const togglePaidTransfer = useMesaStore((s) => s.togglePaidTransfer);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [whyTransfer, setWhyTransfer] = useState<Transfer | null>(null);
  const [whyPersonId, setWhyPersonId] = useState<string | null>(null);
  const [customTip, setCustomTip] = useState(
    mesa.tipPercent !== 0 && mesa.tipPercent !== 10
      ? String(mesa.tipPercent).replace(".", ",")
      : "",
  );
  const transfers = settle(mesa);
  const total = totalCents(mesa);
  const subtotal = subtotalCents(mesa);
  const tip = tipCents(mesa);
  const percent = clampTipPercent(mesa.tipPercent);
  const summaries = personSummaries(mesa);
  const shareText = buildShareText(mesa);
  const customActive = percent !== 0 && percent !== 10;

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copySummary() {
    const ok = await copyText(shareText);
    if (ok) {
      setCopied(true);
      toast.success("División copiada.");
    } else {
      setPreviewOpen(true);
    }
  }

  async function shareSummary() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Mesa · ${mesa.title}`, text: shareText });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    await copySummary();
  }

  return (
    <aside className="flex flex-col gap-6 rounded-3xl bg-card p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          La cuenta
        </p>
        <p className="mt-2 font-display text-4xl leading-none font-medium tracking-tight text-foreground tabular-nums">
          {formatCents(total)}
        </p>
        {tip > 0 ? (
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">
            {formatCents(subtotal)} + propina {formatTipPercent(percent)}
          </p>
        ) : null}
      </div>

      {subtotal > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Propina
          </p>
          <div className="flex flex-wrap gap-2">
            {[0, 10].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTipPercent(mesa.id, value);
                  setCustomTip("");
                }}
                className={cn(
                  "h-11 min-w-14 rounded-full px-4 text-sm transition-[background-color,color] duration-150",
                  percent === value && !customActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground shadow-[var(--shadow-border)]",
                )}
              >
                {value === 0 ? "Sin" : "10%"}
              </button>
            ))}
            <div className="flex h-11 items-center gap-1 rounded-full bg-secondary pr-2 pl-3 shadow-[var(--shadow-border)]">
              <Input
                value={customTip}
                onChange={(event) => {
                  const next = event.target.value;
                  setCustomTip(next);
                  const parsed = Number(next.replace(",", "."));
                  if (Number.isFinite(parsed)) setTipPercent(mesa.id, parsed);
                }}
                onBlur={() => {
                  if (!customTip.trim()) {
                    if (customActive) setTipPercent(mesa.id, 0);
                    return;
                  }
                  const parsed = Number(customTip.replace(",", "."));
                  if (!Number.isFinite(parsed)) return;
                  const clamped = clampTipPercent(parsed);
                  setTipPercent(mesa.id, clamped);
                  setCustomTip(String(clamped).replace(".", ","));
                }}
                inputMode="decimal"
                placeholder="%"
                aria-label="Propina personalizada"
                className={cn(
                  "h-9 w-12 border-0 bg-transparent px-0 text-center text-sm shadow-none focus-visible:ring-0 md:text-sm",
                  customActive ? "text-foreground" : "text-muted-foreground",
                )}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      ) : null}

      {total === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Cuando haya gastos, acá aparece el detalle de cada uno.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Por persona
          </p>
          <ul className="flex flex-col overflow-hidden rounded-2xl bg-background shadow-[var(--shadow-border)]">
            {summaries.map((row, index) => {
              const person = personById(mesa, row.id);
              if (!person) return null;
              const saldo =
                row.netCents > 1
                  ? `le deben ${formatCents(row.netCents)}`
                  : row.netCents < -1
                    ? `debe ${formatCents(-row.netCents)}`
                    : "en cero";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setWhyPersonId(person.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-150 hover:bg-accent",
                      index > 0 ? "border-t border-border" : "",
                    )}
                  >
                    <PersonAvatar id={person.id} name={person.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {person.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground tabular-nums">
                        pagó {formatCents(row.paidCents)} · {saldo}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {transfers.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Manden
          </p>
          <p className="-mt-1 text-xs text-muted-foreground">
            Tocá el movimiento para ver de dónde sale.
          </p>
          <ul className="flex flex-col gap-2">
            {transfers.map((transfer) => {
              const from = personById(mesa, transfer.fromId);
              const to = personById(mesa, transfer.toId);
              if (!from || !to) return null;
              const paid = isTransferPaid(mesa, transfer);
              return (
                <li
                  key={`${transfer.fromId}-${transfer.toId}`}
                  className={cn(
                    "flex items-stretch overflow-hidden rounded-2xl",
                    paid
                      ? "bg-secondary/60 opacity-60"
                      : "bg-background shadow-[var(--shadow-border)]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setWhyTransfer(transfer)}
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                  >
                    <PersonAvatar id={from.id} name={from.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          paid
                            ? "text-muted-foreground line-through"
                            : "text-foreground",
                        )}
                      >
                        {from.name}
                        <span className="text-muted-foreground"> → </span>
                        {to.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {to.mpAlias ? `MP ${to.mpAlias} · ` : null}
                        <span className="tabular-nums">
                          {formatCents(transfer.amountCents)}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    aria-label={
                      paid
                        ? `${from.name} ya le pagó a ${to.name}. Marcar como pendiente.`
                        : `${from.name} le debe a ${to.name}. Marcar como pagado.`
                    }
                    onClick={() =>
                      togglePaidTransfer(mesa.id, transfer.fromId, transfer.toId)
                    }
                    className="inline-flex w-12 shrink-0 items-center justify-center"
                  >
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-full",
                        paid
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground shadow-[var(--shadow-border)]",
                      )}
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : total > 0 ? (
        <p className="text-sm leading-relaxed text-foreground">
          Cuentas saldadas. Nadie se debe nada.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="flex-1 rounded-xl"
          onClick={copySummary}
          disabled={mesa.people.length === 0}
        >
          <span className="relative inline-flex size-4 items-center justify-center">
            <Copy
              className={cn(
                "absolute size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                copied
                  ? "scale-[0.25] opacity-0 blur-[4px]"
                  : "scale-100 opacity-100 blur-none",
              )}
            />
            <Check
              className={cn(
                "absolute size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                copied
                  ? "scale-100 opacity-100 blur-none"
                  : "scale-[0.25] opacity-0 blur-[4px]",
              )}
            />
          </span>
          {copied ? "Copiado" : "Copiar división"}
        </Button>
        {canShare ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 rounded-xl"
            onClick={shareSummary}
            disabled={mesa.people.length === 0}
          >
            <Share2 className="size-4" />
            Compartir
          </Button>
        ) : null}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium tracking-tight">
              Texto para copiar
            </DialogTitle>
            <DialogDescription>
              Seleccioná el resumen y copialo para mandarlo al grupo.
            </DialogDescription>
          </DialogHeader>
          <pre
            tabIndex={0}
            className="max-h-72 overflow-auto rounded-xl bg-background p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-[var(--shadow-border)]"
            onFocus={(event) => {
              const range = document.createRange();
              range.selectNodeContents(event.currentTarget);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }}
          >
            {shareText}
          </pre>
        </DialogContent>
      </Dialog>
      <WhyDialog
        mesa={mesa}
        open={Boolean(whyTransfer || whyPersonId)}
        onOpenChange={(open) => {
          if (!open) {
            setWhyTransfer(null);
            setWhyPersonId(null);
          }
        }}
        transfer={whyTransfer}
        personId={whyPersonId}
      />
    </aside>
  );
}
