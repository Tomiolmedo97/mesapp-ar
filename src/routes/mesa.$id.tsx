import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DeleteMesaDialog } from "@/components/app/delete-mesa-dialog";
import { ExpenseDialog } from "@/components/app/expense-dialog";
import { ExpenseList } from "@/components/app/expense-list";
import { PeopleEditor } from "@/components/app/people-editor";
import { SettlementCard } from "@/components/app/settlement-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMesaHydration } from "@/hooks/use-mesa-hydration";
import { defaultMesaTitle } from "@/lib/money";
import type { Expense } from "@/lib/split";
import { useMesaStore, CREATING_MESA_KEY } from "@/lib/store";

export const Route = createFileRoute("/mesa/$id")({ component: MesaPage });

function MesaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hydrated = useMesaHydration();
  const mesa = useMesaStore((s) => s.mesas.find((m) => m.id === id));
  const updateTitle = useMesaStore((s) => s.updateTitle);
  const deleteMesa = useMesaStore((s) => s.deleteMesa);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CREATING_MESA_KEY) === id) {
        sessionStorage.removeItem(CREATING_MESA_KEY);
      }
    } catch {
      // ignore
    }
  }, [id]);

  if (!hydrated) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-24 sm:px-8">
        <Skeleton className="h-8 w-32 bg-card" />
        <Skeleton className="h-12 w-2/3 bg-card" />
        <Skeleton className="h-64 rounded-3xl bg-card" />
      </main>
    );
  }

  if (!mesa) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-16">
        <h1 className="font-display text-4xl font-medium tracking-tight">
          Esta mesa ya no está
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Puede que se haya borrado en este dispositivo.
        </p>
        <Button asChild className="mt-8 w-fit rounded-xl">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
      <header className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="rounded-full -ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Mesas
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Borrar mesa"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <div className="stagger-in flex flex-col gap-10">
          <input
            value={mesa.title}
            onChange={(e) => updateTitle(mesa.id, e.target.value)}
            onBlur={() => {
              if (!mesa.title.trim()) {
                updateTitle(mesa.id, defaultMesaTitle());
              }
            }}
            aria-label="Nombre de la mesa"
            className="w-full bg-transparent font-display text-2xl leading-tight font-medium tracking-tight text-foreground outline-none sm:text-5xl"
          />

          <PeopleEditor mesa={mesa} />
          <ExpenseList
            mesa={mesa}
            onAdd={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            onEdit={(expense) => {
              setEditing(expense);
              setDialogOpen(true);
            }}
          />
        </div>

        <div className="lg:sticky lg:top-8">
          <SettlementCard mesa={mesa} />
        </div>
      </div>

      <ExpenseDialog
        mesa={mesa}
        expense={editing}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      />

      <DeleteMesaDialog
        open={confirmDelete}
        title={mesa.title}
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          deleteMesa(mesa.id);
          void navigate({ to: "/" });
        }}
      />
    </main>
  );
}
