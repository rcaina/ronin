"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSignIn } from "@/lib/data-hooks/useSignIn";
import { useLoginCode } from "@/lib/data-hooks/useLoginCode";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";
import { EMAIL_PATTERN } from "@/lib/utils/validation";

interface SignInForm {
  email: string;
  password: string;
}

interface CodeEmailForm {
  email: string;
}

interface CodeVerifyForm {
  code: string;
}

type SignInMode = "password" | "code";

export default function SignIn() {
  const [mode, setMode] = useState<SignInMode>("password");
  const { signIn, isLoading, error, resetError } = useSignIn();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const {
    step,
    email: codeEmail,
    isRequesting,
    isVerifying,
    error: codeError,
    resendCooldown,
    requestCode,
    resendCode,
    verifyCode,
    backToEmail,
    resetError: resetCodeError,
  } = useLoginCode();

  const {
    register: registerCodeEmail,
    handleSubmit: handleSubmitCodeEmail,
    formState: { errors: codeEmailErrors },
  } = useForm<CodeEmailForm>({
    defaultValues: { email: "" },
  });

  const {
    register: registerCodeVerify,
    handleSubmit: handleSubmitCodeVerify,
    formState: { errors: codeVerifyErrors },
  } = useForm<CodeVerifyForm>({
    defaultValues: { code: "" },
  });

  const onSubmit = async (data: SignInForm) => {
    resetError();
    try {
      await signIn({
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      console.error(error);
      toast.error("Sign in failed. Please check your credentials.");
    }
  };

  const onSubmitCodeEmail = async (data: CodeEmailForm) => {
    await requestCode(data.email);
  };

  const onSubmitCodeVerify = async (data: CodeVerifyForm) => {
    await verifyCode(data.code);
  };

  const handleResendCode = async () => {
    await resendCode();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleMode = () => {
    setMode((current) => (current === "password" ? "code" : "password"));
    resetError();
    resetCodeError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto h-20 w-20 flex-shrink-0">
            <Image
              src={roninLogo}
              alt="Ronin Logo"
              width={128}
              height={128}
              className="h-full w-full rounded-full ring-2 ring-secondary/40"
              priority
            />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
            Ronin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Sign in to keep your finances on track
          </p>
        </div>

        <div className="card-surface animate-scale-in rounded-2xl p-6 shadow-lifted sm:p-8">
          {mode === "password" ? (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: EMAIL_PATTERN,
                        message: "Invalid email address",
                      },
                    })}
                    className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm"
                    placeholder="Email address"
                  />
                  {errors.email?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 6,
                          message: "Password must be at least 6 characters",
                        },
                      })}
                      className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm"
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="text-center text-sm text-red-600">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-primary-950 shadow-soft transition-all duration-200 ease-out hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                >
                  Sign in with a code instead
                </button>
              </div>

              <div className="text-center text-sm">
                <p className="text-gray-600">
                  Don&apos;t have an account?{" "}
                  <a
                    href="/sign-up"
                    className="font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                  >
                    Sign up
                  </a>
                </p>
              </div>
            </form>
          ) : step === "email" ? (
            <form
              className="space-y-5"
              onSubmit={handleSubmitCodeEmail(onSubmitCodeEmail)}
            >
              <div>
                <p className="mb-4 text-center text-sm text-gray-600">
                  Enter your email and we&apos;ll send you a 6-digit code to
                  sign in.
                </p>
                <label htmlFor="code-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="code-email"
                  type="email"
                  {...registerCodeEmail("email", {
                    required: "Email is required",
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: "Invalid email address",
                    },
                  })}
                  className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm"
                  placeholder="Email address"
                />
                {codeEmailErrors.email?.message && (
                  <p className="mt-1 text-sm text-red-600">
                    {codeEmailErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isRequesting}
                  className="flex w-full justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-primary-950 shadow-soft transition-all duration-200 ease-out hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRequesting ? "Sending..." : "Send code"}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-sm font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
                >
                  Use password instead
                </button>
              </div>
            </form>
          ) : (
            <form
              className="space-y-5"
              onSubmit={handleSubmitCodeVerify(onSubmitCodeVerify)}
            >
              <p className="text-center text-sm text-gray-600">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-gray-900">{codeEmail}</span>
              </p>

              <div>
                <label htmlFor="code" className="sr-only">
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  {...registerCodeVerify("code", {
                    required: "Code is required",
                    pattern: {
                      value: /^\d{6}$/,
                      message: "Enter the 6-digit code",
                    },
                  })}
                  className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 text-center text-lg font-semibold tracking-[0.5em] text-gray-900 placeholder-gray-400 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm"
                  placeholder="------"
                />
                {codeVerifyErrors.code?.message && (
                  <p className="mt-1 text-center text-sm text-red-600">
                    {codeVerifyErrors.code.message}
                  </p>
                )}
              </div>

              {codeError && (
                <div className="text-center text-sm text-red-600">
                  {codeError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex w-full justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-primary-950 shadow-soft transition-all duration-200 ease-out hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVerifying ? "Verifying..." : "Verify & sign in"}
                </button>
              </div>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={backToEmail}
                  className="font-medium text-gray-600 transition-colors duration-200 hover:text-gray-800"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || isRequesting}
                  className="font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
