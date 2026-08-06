import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-base font-medium ring-offset-background transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white hover:bg-accent-hover shadow-md hover:shadow-lg",
        primary:
          "bg-primary text-white hover:opacity-90 shadow-md hover:shadow-lg",
        outline:
          "border border-accent bg-transparent text-accent hover:bg-accent hover:text-white",
        ghost:
          "bg-transparent text-white hover:bg-white/10",
      },
      size: {
        default: "h-11 px-6",
        md: "h-12 px-6",
        lg: "h-14 px-8 text-sm uppercase tracking-[2px]",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };