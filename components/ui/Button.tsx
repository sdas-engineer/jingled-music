import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "spotify";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-full disabled:opacity-40 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-white text-black hover:bg-white/90",
    secondary: "bg-replay-card border border-replay-border text-replay-text-primary hover:bg-replay-hover hover:border-replay-text-muted",
    ghost: "text-replay-text-secondary hover:text-replay-text-primary hover:bg-replay-card",
    spotify: "bg-replay-accent text-black hover:bg-replay-accent/90 glow-green",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-sm px-6 py-3",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
