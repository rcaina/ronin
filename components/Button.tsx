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
      "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

    const variants = {
      primary:
        "bg-secondary text-primary-950 shadow-soft hover:bg-secondary-400 hover:shadow-card focus-visible:ring-secondary",
      secondary:
        "bg-primary-950 text-white shadow-soft hover:bg-primary-800 focus-visible:ring-primary-800",
      danger:
        "bg-red-600 text-white shadow-soft hover:bg-red-700 focus-visible:ring-red-500",
      outline:
        "border border-gray-300 bg-surface-card text-gray-800 shadow-soft hover:border-gray-400 hover:bg-gray-50 focus-visible:ring-gray-400",
      ghost:
        "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400",
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
