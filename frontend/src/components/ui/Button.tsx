import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
}

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  secondary: "glass border-white/20 text-gray-200 hover:bg-white/10",
  danger: "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20",
  ghost: "text-gray-400 hover:text-gray-200 hover:bg-white/5",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
  icon: "p-2",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  ...rest
}) => {
  const classes = [
    variants[variant],
    sizes[size],
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
    fullWidth ? "w-full" : "",
    className,
  ].join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
};