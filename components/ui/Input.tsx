import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-500",
        "focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
export default Input;
