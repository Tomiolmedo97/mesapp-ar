import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useMesaHydration } from "@/hooks/use-mesa-hydration";
import { CREATING_MESA_KEY, useMesaStore } from "@/lib/store";

type NuevaSearch = {
  grupo?: string;
};

export const Route = createFileRoute("/nueva")({
  validateSearch: (search: Record<string, unknown>): NuevaSearch => ({
    grupo: typeof search.grupo === "string" ? search.grupo : undefined,
  }),
  component: NuevaMesa,
});

function NuevaMesa() {
  const { grupo } = Route.useSearch();
  const hydrated = useMesaHydration();
  const createMesa = useMesaStore((s) => s.createMesa);
  const mesas = useMesaStore((s) => s.mesas);
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    ran.current = true;

    if (!grupo) {
      try {
        const pending = sessionStorage.getItem(CREATING_MESA_KEY);
        if (pending && mesas.some((mesa) => mesa.id === pending)) {
          sessionStorage.removeItem(CREATING_MESA_KEY);
          void navigate({
            to: "/mesa/$id",
            params: { id: pending },
            replace: true,
          });
          return;
        }
      } catch {
        // sessionStorage blocked
      }
    }

    const id = createMesa(grupo);
    try {
      sessionStorage.setItem(CREATING_MESA_KEY, id);
    } catch {
      // ignore
    }
    void navigate({ to: "/mesa/$id", params: { id }, replace: true });
  }, [hydrated, createMesa, mesas, navigate, grupo]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 pt-8 pb-24 sm:px-8">
      <Skeleton className="h-8 w-32 bg-card" />
      <Skeleton className="h-12 w-2/3 bg-card" />
      <Skeleton className="h-64 rounded-3xl bg-card" />
    </main>
  );
}
