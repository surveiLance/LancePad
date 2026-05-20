import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/40 hover:shadow-purple-700/40 active:scale-95":
              variant === "primary",
            "bg-gray-800 hover:bg-gray-700 text-gray-100 border border-gray-700":
              variant === "secondary",
            "hover:bg-gray-800 text-gray-400 hover:text-gray-100":
              variant === "ghost",
            "bg-red-900/50 hover:bg-red-800/50 text-red-400 border border-red-800":
              variant === "danger",
          },
          {
            "text-sm px-3 py-1.5 gap-1.5": size === "sm",
            "text-sm px-4 py-2 gap-2": size === "md",
            "text-base px-6 py-3 gap-2.5": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
