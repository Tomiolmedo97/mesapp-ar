import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents, parseAmountToCents } from "@/lib/money";
import type { Expense, Mesa } from "@/lib/split";
import { useMesaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  mesa: Mesa;
  expense?: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExpenseDialog({ mesa, expense, open, onOpenChange }: Props) {
  const addExpense = useMesaStore((s) => s.addExpense);
  const updateExpense = useMesaStore((s) => s.updateExpense);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(mesa.people[0]?.id ?? "");
  const [splitAmong, setSplitAmong] = useState<string[]>(
    mesa.people.map((p) => p.id),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDescription(expense.description);
      setAmount(formatCents(expense.amountCents, { withSymbol: false }));
      setPaidBy(expense.paidBy);
      setSplitAmong(expense.splitAmong);
    } else {
      setDescription("");
      setAmount("");
      setPaidBy(mesa.people[0]?.id ?? "");
      setSplitAmong(mesa.people.map((p) => p.id));
    }
    setError(null);
  }, [open, expense, mesa.people]);

  const allSelected = useMemo(
    () =>
      mesa.people.length > 0 && splitAmong.length === mesa.people.length,
    [mesa.people, splitAmong],
  );

  function togglePerson(id: string) {
    setSplitAmong((current) =>
      current.includes(id)
        ? current.filter((p) => p !== id)
        : [...current, id],
    );
  }

  function submit() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!paidBy) {
      setError("Elegí quién pagó.");
      return;
    }
    if (splitAmong.length === 0) {
      setError("Alguien tiene que participar del gasto.");
      return;
    }

    const payload = {
      description,
      amountCents: cents,
      paidBy,
      splitAmong,
    };

    if (expense) {
      updateExpense(mesa.id, expense.id, payload);
    } else {
      addExpense(mesa.id, payload);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            {expense ? "Editar gasto" : "Nuevo gasto"}
          </DialogTitle>
          <DialogDescription>
            {expense
              ? "Ajustá el detalle, el monto o quiénes lo dividen."
              : "Cargá lo que se pagó y entre quiénes se parte."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-desc">Qué</Label>
            <Input
              id="expense-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pizza, vino, delivery…"
              className="h-11 rounded-lg bg-background"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expense-amount">Monto</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="expense-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="h-11 rounded-lg bg-background pl-7 tabular-nums"
                autoComplete="off"
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Quién pagó</legend>
            <div className="flex flex-wrap gap-2">
              {mesa.people.map((person) => {
                const selected = paidBy === person.id;
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setPaidBy(person.id)}
                    className={cn(
                      "h-11 rounded-full px-4 text-sm transition-[background-color,color,box-shadow] duration-150",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground shadow-[var(--shadow-border)]",
                    )}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-medium">Se divide entre</legend>
              <button
                type="button"
                className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() =>
                  setSplitAmong(
                    allSelected ? [] : mesa.people.map((p) => p.id),
                  )
                }
              >
                {allSelected ? "Ninguno" : "Todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {mesa.people.map((person) => {
                const selected = splitAmong.includes(person.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => togglePerson(person.id)}
                    className={cn(
                      "h-11 rounded-full px-4 text-sm transition-[background-color,color,box-shadow] duration-150",
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground shadow-[var(--shadow-border)]",
                    )}
                  >
                    {person.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={submit}>
            {expense ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
