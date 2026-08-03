import { kindLabel } from "../lib/slides";
import type { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
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
      className={"chip" + (active ? " chip--on" : "")}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="hint">{children}</p>;
}
