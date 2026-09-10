import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { MesaMark } from "@/components/app/mark";
import { PersonAvatar } from "@/components/app/person-avatar";
import { InstallPrompt } from "@/components/app/install-prompt";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMesaHydration } from "@/hooks/use-mesa-hydration";
import { formatCents, formatDate } from "@/lib/money";
import { totalCents } from "@/lib/split";
import { useMesaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useMesaHydration();
  const mesas = useMesaStore((s) => s.mesas);
  const groups = useMesaStore((s) => s.groups);
  const deleteGroup = useMesaStore((s) => s.deleteGroup);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 pt-10 pb-24 sm:px-8 sm:pt-16">
      <header className="flex flex-col gap-6">
        <div className="stagger-in flex flex-col gap-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MesaMark className="size-5" />
            <span className="text-sm font-medium tracking-[0.18em] uppercase">
              Mesa
            </span>
          </div>
          <div className="max-w-lg">
            <h1 className="font-display text-[2.65rem] leading-[1.05] font-medium tracking-tight text-foreground sm:text-6xl">
              Dividí la cuenta entre amigos.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              Cargá lo que se pagó, copiá el reparto y mandalo al grupo. Sin
              vueltas.
            </p>
          </div>
        </div>
        <div>
          <Link
            to="/nueva"
            className={cn(buttonVariants({ size: "lg" }), "rounded-xl")}
          >
            <Plus className="size-4" />
            Nueva mesa
          </Link>
        </div>
      </header>

      {hydrated && groups.length > 0 ? (
        <section className="mt-14 flex flex-col gap-4">
          <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Grupos
          </h2>
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li
                key={group.id}
                className="flex items-center gap-2 rounded-2xl bg-card pr-1 shadow-[var(--shadow-border)]"
              >
                <Link
                  to="/nueva"
                  search={{ grupo: group.id }}
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-4 px-4 py-3 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-medium tracking-tight text-foreground">
                      {group.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {group.people.map((p) => p.name).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center -space-x-2">
                    {group.people.slice(0, 3).map((person) => (
                      <PersonAvatar
                        key={`${group.id}-${person.name}`}
                        id={`${group.id}-${person.name}`}
                        name={person.name}
                        size="sm"
                      />
                    ))}
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Borrar grupo ${group.name}`}
                  className="relative mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  onClick={() => {
                    deleteGroup(group.id);
                    toast("Grupo borrado.");
                  }}
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14 flex flex-col gap-4 sm:mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Recientes
          </h2>
        </div>

        {!hydrated ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-24 rounded-2xl bg-card" />
            <Skeleton className="h-24 rounded-2xl bg-card" />
          </div>
        ) : mesas.length === 0 ? (
          <p className="rounded-2xl bg-card px-5 py-8 text-sm leading-relaxed text-muted-foreground shadow-[var(--shadow-border)]">
            Todavía no hay mesas. Abrí una cuando te sientes a comer.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {mesas.map((mesa) => (
              <li key={mesa.id}>
                <Link
                  to="/mesa/$id"
                  params={{ id: mesa.id }}
                  className="flex items-center gap-4 rounded-2xl bg-card px-4 py-4 shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)] active:scale-[0.99] sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-xl font-medium tracking-tight text-foreground">
                      {mesa.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(mesa.createdAt)}
                      {mesa.people.length > 0
                        ? ` · ${mesa.people.length} ${mesa.people.length === 1 ? "persona" : "personas"}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {mesa.people.length > 0 ? (
                      <div className="flex items-center -space-x-2">
                        {mesa.people.slice(0, 3).map((person) => (
                          <PersonAvatar
                            key={person.id}
                            id={person.id}
                            name={person.name}
                            size="sm"
                          />
                        ))}
                      </div>
                    ) : null}
                    <p className="text-sm font-medium tabular-nums text-foreground">
                      {formatCents(totalCents(mesa))}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InstallPrompt />
    </main>
  );
}
