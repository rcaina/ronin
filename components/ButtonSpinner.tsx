interface ButtonSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ButtonSpinner = ({ size = "md", className = "" }: ButtonSpinnerProps) => {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
};

export default ButtonSpinner;
