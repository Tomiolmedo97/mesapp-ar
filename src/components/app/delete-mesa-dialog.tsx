import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DeleteMesaDialog({
  open,
  title,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            ¿Borrar esta mesa?
          </DialogTitle>
          <DialogDescription>
            Se elimina “{title}” y todos sus gastos. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" type="button" onClick={onConfirm}>
            Borrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
