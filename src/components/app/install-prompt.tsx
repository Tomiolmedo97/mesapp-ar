import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MesaMark } from "@/components/app/mark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "mesa-install-dismissed-at";
const SNOOZE_MS = 60 * 60 * 1000;
const PHONE_QUERY = "(max-width: 40rem)";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function writeDismissedAt(timestamp: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp));
  } catch {
    // iframe / private mode
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isPhone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_QUERY).matches;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs;
}

function shouldShowBanner(): boolean {
  if (isStandalone() || !isPhone()) return false;
  const dismissedAt = readDismissedAt();
  if (!dismissedAt) return true;
  return Date.now() - dismissedAt >= SNOOZE_MS;
}

export function InstallPrompt() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const ios = ready ? isIos() : true;

  useEffect(() => {
    setReady(true);
    setVisible(shouldShowBanner());

    const media = window.matchMedia(PHONE_QUERY);
    const onChange = () => setVisible(shouldShowBanner());
    media.addEventListener("change", onChange);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const onInstalled = () => {
      setVisible(false);
      setGuideOpen(false);
      writeDismissedAt(Date.now());
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!ready || visible) return;
    const dismissedAt = readDismissedAt();
    if (!dismissedAt) return;
    const remaining = dismissedAt + SNOOZE_MS - Date.now();
    if (remaining <= 0) {
      setVisible(shouldShowBanner());
      return;
    }
    const timer = window.setTimeout(() => {
      setVisible(shouldShowBanner());
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [ready, visible]);

  function dismiss() {
    writeDismissedAt(Date.now());
    setVisible(false);
    setGuideOpen(false);
  }

  async function install() {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        setDeferred(null);
        if (choice.outcome === "accepted") {
          dismiss();
          return;
        }
      } catch {
        // fall through to the guide
      }
    }
    setGuideOpen(true);
  }

  if (!ready || !visible) return null;

  const steps = ios
    ? [
        "Tocá “Compartir” en la barra del navegador.",
        "Elegí “Agregar a pantalla de inicio”.",
        "Revisá el nombre, tocá “Agregar” y abrí Mesa desde tu inicio.",
      ]
    : [
        "Tocá el menú del navegador (los tres puntos).",
        "Elegí “Instalar app” o “Agregar a pantalla de inicio”.",
        "Confirmá y abrí Mesa desde tu inicio.",
      ];

  return (
    <>
      <div className="h-24 sm:hidden" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4 sm:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-3xl bg-card py-2 pr-1 pl-2 shadow-[var(--shadow-border)]">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <MesaMark className="size-5" />
          </span>
          <p className="min-w-0 flex-1 text-xs leading-snug text-foreground">
            Llevá Mesa siempre a mano y dividí la cuenta en segundos.
          </p>
          <Button
            type="button"
            size="sm"
            className="h-11 rounded-full px-4"
            onClick={install}
          >
            Instalar
          </Button>
          <button
            type="button"
            aria-label="Cerrar aviso de instalar"
            onClick={dismiss}
            className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader className="gap-3 pr-6 text-left">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MesaMark className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  Seguí los pasos
                </p>
                <DialogTitle className="mt-1 font-display text-3xl font-medium tracking-tight">
                  Para instalar Mesa
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-sm leading-relaxed">
              Usala como una app en tu celular: más rápida, a un toque desde el
              inicio.
            </DialogDescription>
          </DialogHeader>

          <ol className="flex flex-col gap-4 pt-1">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-foreground">
                  {step}
                </p>
              </li>
            ))}
          </ol>

          <Button
            type="button"
            className="mt-2 h-12 w-full rounded-full"
            onClick={() => setGuideOpen(false)}
          >
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
