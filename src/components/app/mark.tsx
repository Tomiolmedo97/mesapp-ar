export function MesaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="16"
        cy="16"
        r="12.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="16"
        cy="16"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M16 3.5v25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
