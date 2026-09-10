import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?: "indigo" | "green" | "red" | "gray";
  className?: string;
}

const colors: Record<NonNullable<BadgeProps["color"]>, string> = {
  indigo: "bg-accent/10 border-accent/20 text-accent",
  green: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
  gray: "bg-surface border border-border text-text-muted",
};

export const Badge: React.FC<BadgeProps> = ({ children, color = "indigo", className = "" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
};
