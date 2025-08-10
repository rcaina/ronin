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
    <div className={`flex ${className} items-center justify-center bg-gray-50`}>
      <div className="text-center">
        <div
          className={`relative mx-auto ${logoSize === "lg" ? "mb-6" : "mb-4"}`}
        >
          <div className={`mx-auto ${sizeClasses[logoSize]} flex-shrink-0`}>
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={128}
              height={128}
              className="h-full w-full rounded-full"
              priority
            />
          </div>
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
