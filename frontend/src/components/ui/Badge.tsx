import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  color?: "indigo" | "green" | "red" | "gray";
  className?: string;
}

const colors: Record<NonNullable<BadgeProps["color"]>, string> = {
  indigo: "bg-indigo-500/20 border-indigo-500/30 text-indigo-300",
  green: "bg-green-500/20 border-green-500/30 text-green-400",
  red: "bg-red-500/20 border-red-500/30 text-red-400",
  gray: "bg-white/10 border-white/10 text-gray-400",
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