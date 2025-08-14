import { type ButtonHTMLAttributes, forwardRef } from "react";
import ButtonSpinner from "./ButtonSpinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  spinnerSize?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      spinnerSize,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    const variants = {
      primary:
        "bg-secondary text-black/90 shadow-sm hover:bg-accent focus:ring-accent",
      secondary:
        "bg-black/90 text-white shadow-sm hover:bg-black/20 focus:ring-black/50",
      danger:
        "bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500",
      outline:
        "bg-transparent border border-black/90 text-black/90 shadow-sm hover:bg-black/90 hover:text-white focus:ring-black/50",
      ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-500",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const combinedClassName =
      `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim();

    return (
      <button
        className={combinedClassName}
        ref={ref}
        disabled={disabled ?? isLoading}
        {...props}
      >
        {isLoading ? (
          <ButtonSpinner size={spinnerSize ?? size} className="mr-2" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
