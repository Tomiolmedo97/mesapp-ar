import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/app/person-avatar";
import { formatCents } from "@/lib/money";
import { personById, type Expense, type Mesa } from "@/lib/split";
import { useMesaStore } from "@/lib/store";

export function ExpenseList({
  mesa,
  onAdd,
  onEdit,
}: {
  mesa: Mesa;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
}) {
  const removeExpense = useMesaStore((s) => s.removeExpense);
  const canAdd = mesa.people.length > 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
          Gastos
        </h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          disabled={!canAdd}
          onClick={onAdd}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>

      {!canAdd ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Primero sumá personas para cargar un gasto.
        </p>
      ) : mesa.expenses.length === 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex min-h-28 flex-col items-start justify-center rounded-2xl bg-card px-5 py-6 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]"
        >
          <span className="font-display text-lg text-foreground">
            Todavía no hay nada cargado
          </span>
          <span className="mt-1 text-sm text-muted-foreground">
            Tocá para agregar el primer gasto.
          </span>
        </button>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)]">
          {mesa.expenses.map((expense, index) => {
            const payer = personById(mesa, expense.paidBy);
            const among =
              expense.splitAmong.length === mesa.people.length
                ? "Entre todos"
                : `${expense.splitAmong.length} de ${mesa.people.length}`;
            return (
              <li
                key={expense.id}
                className={
                  index === 0 ? "" : "border-t border-border"
                }
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onEdit(expense)}
                    className="flex min-h-16 flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    {payer ? (
                      <PersonAvatar id={payer.id} name={payer.name} />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {expense.description}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        Pagó {payer?.name ?? "alguien"} · {among}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {formatCents(expense.amountCents)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="relative inline-flex w-11 items-center justify-center text-muted-foreground transition-[color,background-color] duration-150 hover:bg-accent hover:text-foreground"
                    aria-label={`Eliminar ${expense.description}`}
                    onClick={() => removeExpense(mesa.id, expense.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
