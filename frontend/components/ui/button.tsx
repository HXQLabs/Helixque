// components/ui/button.tsx

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
}

const variants = {
  default:
    "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
  destructive:
    "inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90",
  outline:
    "inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted hover:text-muted-foreground",
  secondary:
    "inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80",
  ghost:
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium hover:bg-muted hover:text-muted-foreground",
  link: "inline-flex items-center text-sm font-medium underline-offset-4 hover:underline text-primary",
  // extend as needed
  sm: "h-9 px-3 rounded-md",
  lg: "h-11 px-8 rounded-md",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          variants[variant],
          size === "sm" ? variants.sm : size === "lg" ? variants.lg : "",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
