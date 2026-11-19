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
    // Flat fills: each state is its own color, no shadow or press scale, and
    // disabled is a grey block rather than a faded fill.
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-150 ease-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed";

    // A loading button keeps its fill so a pending action doesn't read as unavailable.
    const solidDisabled = isLoading
      ? ""
      : "disabled:bg-gray-200 disabled:text-gray-500";
    const outlineDisabled = isLoading
      ? ""
      : "disabled:border-gray-200 disabled:text-gray-400";

    const variants = {
      primary: `bg-secondary text-secondary-foreground enabled:hover:bg-secondary-600 enabled:active:bg-secondary-700 focus-visible:ring-secondary ${solidDisabled}`,
      secondary: `bg-primary-950 text-white enabled:hover:bg-primary-800 enabled:active:bg-primary-700 focus-visible:ring-primary-800 ${solidDisabled}`,
      danger: `bg-red-600 text-white enabled:hover:bg-red-700 enabled:active:bg-red-800 focus-visible:ring-red-500 ${solidDisabled}`,
      outline: `border border-gray-300 bg-surface-card text-gray-800 enabled:hover:border-gray-400 enabled:hover:bg-gray-50 enabled:active:bg-gray-100 focus-visible:ring-gray-400 ${outlineDisabled}`,
      ghost: `text-gray-600 enabled:hover:bg-gray-100 enabled:hover:text-gray-900 enabled:active:bg-gray-200 focus-visible:ring-gray-400 ${isLoading ? "" : "disabled:text-gray-400"}`,
    };

    // 44px by default; sm drops to 32px only on desktop, where there is no touch.
    const sizes = {
      sm: "min-h-11 px-3 py-1.5 text-sm lg:min-h-8",
      md: "min-h-11 px-4 py-2 text-sm",
      lg: "min-h-12 px-6 py-3 text-base",
    };

    const combinedClassName =
      `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim();

    return (
      <button
        className={combinedClassName}
        ref={ref}
        disabled={disabled ?? isLoading}
        aria-busy={isLoading || undefined}
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
