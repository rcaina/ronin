import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";

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
    <div className={`flex ${className} items-center justify-center bg-surface`}>
      <div className="animate-fade-in text-center">
        <div
          className={`relative mx-auto ${logoSize === "lg" ? "mb-6" : "mb-4"}`}
        >
          <div className={`mx-auto ${sizeClasses[logoSize]} flex-shrink-0`}>
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={128}
              height={128}
              className="h-full w-full animate-pulse rounded-full ring-4 ring-secondary/20"
              priority
            />
          </div>
        </div>
        {showWelcome && (
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
            Welcome to Ronin
          </h2>
        )}
        <div className="text-sm font-medium text-gray-500">{message}</div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
