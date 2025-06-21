interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  showWelcome?: boolean;
  logoSize?: "sm" | "md" | "lg";
}

const LoadingSpinner = ({
  message = "Loading...",
  className = "h-screen",
  showWelcome = false,
  logoSize = "lg",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  };

  return (
    <div className={`flex ${className} items-center justify-center bg-gray-50`}>
      <div className="text-center">
        <div
          className={`relative mx-auto ${logoSize === "lg" ? "mb-6" : "mb-4"} ${sizeClasses[logoSize]}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-full w-full animate-pulse text-secondary"
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
              fill="currentColor"
            />
            <path
              d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
              fill="currentColor"
            />
          </svg>
        </div>
        {showWelcome && (
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Welcome to Ronin
          </h2>
        )}
        <div className="text-lg text-gray-600">{message}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
