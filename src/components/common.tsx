import { kindLabel } from "../lib/slides";
import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 whitespace-nowrap rounded-full border border-surface-3 bg-surface-2 px-1.5 py-0.5 text-xs text-ink-muted">
      {children}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string | null | undefined }) {
  return <Badge>{kindLabel(kind)}</Badge>;
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        "rounded-full border border-surface-3 bg-surface-2 px-2.5 py-1 text-xs text-ink-muted" +
        (active ? " border-brand bg-brand-weak text-brand" : "")
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="m-0 text-center text-xs text-ink-muted">{children}</p>;
}
