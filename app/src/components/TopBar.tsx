import type { ReactNode } from "react";

export default function TopBar({ right }: { right?: ReactNode }) {
  return (
    <div className="topbar">
      <span className="brand">EZ.Path.AI</span>
      {right}
    </div>
  );
}
