import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MesaMark } from "@/components/app/mark";
import { PersonAvatar } from "@/components/app/person-avatar";
import { ExpenseList } from "@/components/app/expense-list";
import { SettlementCard } from "@/components/app/settlement-card";
import { Button } from "@/components/ui/button";
import { decodeMesaToken } from "@/lib/mesa-link";

export const Route = createFileRoute("/m/$token")({
  component: SharedMesa,
});

function SharedMesa() {
  const { token } = Route.useParams();
  const mesa = useMemo(() => decodeMesaToken(token), [token]);

  if (!mesa) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-5 py-16">
        <MesaMark className="size-8 text-foreground" />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight">
          Este link no se puede abrir
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Está incompleto o ya no es válido. Pedile a quien armó la mesa que lo
          comparta de nuevo.
        </p>
        <Button asChild className="mt-8 w-fit rounded-xl">
          <Link to="/">Abrir Mesa</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 pt-6 pb-24 sm:px-8 sm:pt-10">
      <header className="flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-2 rounded-full pr-3 pl-1 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <MesaMark className="size-4" />
          Mesa
        </Link>
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          Link
        </p>
      </header>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <div className="flex flex-col gap-10">
          <div>
            <h1 className="font-display text-2xl leading-tight font-medium tracking-tight text-foreground sm:text-5xl">
              {mesa.title}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Foto de la mesa al momento de compartir el link. Si después cambia
              algo, hay que compartirlo de nuevo.
            </p>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-medium tracking-tight">
              Personas
            </h2>
            <ul className="flex flex-wrap gap-2">
              {mesa.people.map((person) => (
                <li
                  key={person.id}
                  className="flex min-h-11 items-center gap-2 rounded-full bg-secondary py-1 pr-3 pl-1 shadow-[var(--shadow-border)]"
                >
                  <PersonAvatar id={person.id} name={person.name} size="sm" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="max-w-40 truncate text-sm text-foreground">
                      {person.name}
                    </span>
                    {person.mpAlias ? (
                      <span className="max-w-40 truncate text-xs text-muted-foreground">
                        {person.mpAlias}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <ExpenseList mesa={mesa} readOnly />
        </div>

        <div className="lg:sticky lg:top-8">
          <SettlementCard mesa={mesa} readOnly />
        </div>
      </div>
    </main>
  );
}
