import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-[48px] w-full rounded-md border border-secondary/10 dark:border-white/10 bg-white dark:bg-[#1c1c22] px-4 py-5 text-base text-secondary dark:text-white placeholder:text-secondary/60 dark:placeholder:text-white/60 outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };