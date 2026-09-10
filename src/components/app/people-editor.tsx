import { useState, type FormEvent } from "react";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
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
import { PersonAvatar } from "@/components/app/person-avatar";
import type { Mesa, Person } from "@/lib/split";
import { useMesaStore } from "@/lib/store";

export function PeopleEditor({ mesa }: { mesa: Mesa }) {
  const addPerson = useMesaStore((s) => s.addPerson);
  const updatePerson = useMesaStore((s) => s.updatePerson);
  const removePerson = useMesaStore((s) => s.removePerson);
  const saveGroupFromMesa = useMesaStore((s) => s.saveGroupFromMesa);
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [editing, setEditing] = useState<Person | null>(null);
  const [editName, setEditName] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = mesa.people.some(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast("Esa persona ya está en la mesa.");
      return;
    }
    addPerson(mesa.id, trimmed, alias);
    setName("");
    setAlias("");
  }

  function openEdit(person: Person) {
    setEditing(person);
    setEditName(person.name);
    setEditAlias(person.mpAlias ?? "");
  }

  function saveEdit() {
    if (!editing) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    updatePerson(mesa.id, editing.id, { name: trimmed, mpAlias: editAlias });
    setEditing(null);
  }

  function saveGroup() {
    const label = groupName.trim() || "Los de siempre";
    saveGroupFromMesa(mesa.id, label);
    setGroupOpen(false);
    setGroupName("");
    toast("Grupo guardado. Lo ves en el inicio.");
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-medium tracking-tight text-foreground">
          Personas
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          {mesa.people.length}
        </p>
      </div>

      {mesa.people.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Sumá a quienes están en la mesa. El alias de MP es opcional.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {mesa.people.map((person) => (
            <li
              key={person.id}
              className="flex min-h-11 items-center gap-2 rounded-full bg-secondary py-1 pr-1 pl-1 shadow-[var(--shadow-border)]"
            >
              <button
                type="button"
                onClick={() => openEdit(person)}
                className="flex min-h-9 items-center gap-2 pl-0 pr-1"
              >
                <PersonAvatar id={person.id} name={person.name} size="sm" />
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="max-w-32 truncate text-sm text-foreground">
                    {person.name}
                  </span>
                  {person.mpAlias ? (
                    <span className="max-w-32 truncate text-xs text-muted-foreground">
                      {person.mpAlias}
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                className="relative inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color] duration-150 hover:bg-accent hover:text-foreground after:absolute after:inset-[-4px]"
                aria-label={`Quitar a ${person.name}`}
                onClick={() => {
                  removePerson(mesa.id, person.id);
                  toast(`${person.name} salió de la mesa.`);
                }}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre"
          aria-label="Nombre de la persona"
          autoComplete="off"
          className="h-11 rounded-lg bg-card text-base md:text-sm"
        />
        <Input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="alias.mp"
          aria-label="Alias de Mercado Pago"
          autoComplete="off"
          className="h-11 rounded-lg bg-card text-base md:text-sm sm:max-w-40"
        />
        <Button type="submit" variant="secondary" className="rounded-lg px-5">
          Sumar
        </Button>
      </form>

      {mesa.people.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            setGroupName(mesa.title);
            setGroupOpen(true);
          }}
          className="flex h-11 w-fit items-center gap-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground"
        >
          <Bookmark className="size-3.5" />
          Guardar grupo
        </button>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium tracking-tight">
              Editar persona
            </DialogTitle>
            <DialogDescription>
              El alias aparece cuando alguien le tiene que transferir.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-lg bg-background"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-alias">Alias de Mercado Pago</Label>
              <Input
                id="edit-alias"
                value={editAlias}
                onChange={(e) => setEditAlias(e.target.value)}
                placeholder="alias.mp"
                className="h-11 rounded-lg bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveEdit}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="rounded-2xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-medium tracking-tight">
              Guardar grupo
            </DialogTitle>
            <DialogDescription>
              Queda en el inicio para armar la próxima mesa en un toque.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Nombre del grupo</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Los del jueves"
              className="h-11 rounded-lg bg-background"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setGroupOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveGroup}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
