import { useEffect } from "react";
import { useMesaStore } from "@/lib/store";

export function useMesaHydration() {
  const hydrated = useMesaStore((s) => s.hydrated);

  useEffect(() => {
    if (useMesaStore.getState().hydrated) return;

    if (useMesaStore.persist.hasHydrated?.()) {
      useMesaStore.getState().setHydrated(true);
      return;
    }

    const finish = () => {
      useMesaStore.getState().setHydrated(true);
    };

    const unsub = useMesaStore.persist.onFinishHydration(finish);

    try {
      const result = useMesaStore.persist.rehydrate();
      void Promise.resolve(result).then(finish).catch(finish);
    } catch {
      finish();
    }

    const timeout = window.setTimeout(finish, 800);
    return () => {
      unsub();
      window.clearTimeout(timeout);
    };
  }, []);

  return hydrated;
}
