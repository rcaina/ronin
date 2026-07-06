import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { requestLoginCode, signInWithCode } from "./services/auth";

const RESEND_COOLDOWN_SECONDS = 60;

type LoginCodeStep = "email" | "code";

interface UseLoginCodeReturn {
  step: LoginCodeStep;
  email: string;
  isRequesting: boolean;
  isVerifying: boolean;
  error: string | null;
  resendCooldown: number;
  requestCode: (email: string) => Promise<void>;
  resendCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<void>;
  backToEmail: () => void;
  resetError: () => void;
}

export function useLoginCode(): UseLoginCodeReturn {
  const [step, setStep] = useState<LoginCodeStep>("email");
  const [email, setEmail] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();

  const isCoolingDown = resendCooldown > 0;

  useEffect(() => {
    if (!isCoolingDown) return;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isCoolingDown]);

  const requestCode = async (emailValue: string) => {
    setIsRequesting(true);
    setError(null);

    try {
      await requestLoginCode({ email: emailValue });
      setEmail(emailValue);
      setStep("code");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Check your email for a 6-digit code");
    } catch {
      const message = "Failed to send code. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setIsRequesting(true);
    setError(null);

    try {
      await requestLoginCode({ email });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success("Check your email for a new code");
    } catch {
      const message = "Failed to resend code. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const verifyCode = async (code: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      await signInWithCode({ email, code });
      toast.success("Signed in");
      router.push("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid or expired code";
      setError(message);
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setError(null);
    setResendCooldown(0);
  };

  const resetError = () => {
    setError(null);
  };

  return {
    step,
    email,
    isRequesting,
    isVerifying,
    error,
    resendCooldown,
    requestCode,
    resendCode,
    verifyCode,
    backToEmail,
    resetError,
  };
}
