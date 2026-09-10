import { cn } from "@/lib/utils";
import { initials, toneFor } from "@/lib/avatars";

export function PersonAvatar({
  id,
  name,
  size = "md",
}: {
  id: string;
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium tracking-wide text-foreground",
        size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs",
      )}
      style={{ backgroundColor: toneFor(id) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
