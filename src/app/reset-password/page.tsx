"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";
import { useResetPassword } from "@/lib/data-hooks/useResetPassword";

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
      />
    </svg>
  ) : (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function InvalidLink() {
  return (
    <div className="space-y-5 text-center">
      <p className="text-sm text-gray-600">
        This password reset link is invalid or has expired.
      </p>
      <Link
        href="/forgot-password"
        className="inline-block text-sm font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
      >
        Request a new link
      </Link>
    </div>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const { resetPassword, isLoading, error, resetError } = useResetPassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = watch("password");

  if (!token || !email) {
    return <InvalidLink />;
  }

  const onSubmit = async (data: ResetPasswordForm) => {
    resetError();
    try {
      await resetPassword({ email, token, password: data.password });
      toast.success("Password reset. You can sign in now.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="password" className="sr-only">
          New password
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
            placeholder="New password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        {errors.password?.message && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="sr-only">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "The passwords do not match",
            })}
            className="block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm"
            placeholder="Confirm new password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showConfirmPassword} />
          </button>
        </div>
        {errors.confirmPassword?.message && (
          <p className="mt-1 text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {error && (
        <div className="text-center text-sm text-red-600">
          {error}{" "}
          <Link
            href="/forgot-password"
            className="font-medium underline hover:text-red-700"
          >
            Request a new link
          </Link>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-primary-950 shadow-soft transition-all duration-200 ease-out hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Resetting..." : "Reset password"}
        </button>
      </div>

      <div className="text-center text-sm">
        <Link
          href="/sign-in"
          className="font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPassword() {
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
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Make it something you&apos;ll remember
          </p>
        </div>

        <div className="card-surface animate-scale-in rounded-2xl p-6 shadow-lifted sm:p-8">
          <Suspense
            fallback={
              <div className="text-center text-sm text-gray-500">
                Loading...
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
