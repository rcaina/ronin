"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSignUp } from "@/lib/data-hooks/useSignUp";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";
import { EMAIL_PATTERN } from "@/lib/utils/validation";

interface SignUpForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const inputClassName =
  "block w-full appearance-none rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary sm:text-sm";

export default function SignUp() {
  const { signUp, isLoading, error, resetError } = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpForm>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");

  const onSubmit = async (data: SignUpForm) => {
    resetError();
    try {
      await signUp({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
    } catch (error) {
      console.error("Failed to sign up:", error);
      toast.error("Sign up failed. Please try again.");
    }
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
              className="h-full w-full rounded-full ring-2 ring-accent-400/40"
              priority
            />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-accent-400">
            Ronin
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Start planning your month in a few minutes
          </p>
        </div>

        <div className="card-surface animate-scale-in rounded-2xl p-6 shadow-lifted sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="sr-only">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    autoComplete="given-name"
                    {...register("firstName", {
                      required: "First name is required",
                      minLength: {
                        value: 2,
                        message: "First name must be at least 2 characters",
                      },
                    })}
                    className={inputClassName}
                    placeholder="First name"
                  />
                  {errors.firstName?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="sr-only">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    autoComplete="family-name"
                    {...register("lastName", {
                      required: "Last name is required",
                      minLength: {
                        value: 2,
                        message: "Last name must be at least 2 characters",
                      },
                    })}
                    className={inputClassName}
                    placeholder="Last name"
                  />
                  {errors.lastName?.message && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: "Invalid email address",
                    },
                  })}
                  className={inputClassName}
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
                    autoComplete="new-password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters",
                      },
                    })}
                    className={`${inputClassName} pr-10`}
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="tap-target absolute inset-y-0 right-0 flex items-center text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
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

              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === password || "The passwords do not match",
                    })}
                    className={`${inputClassName} pr-10`}
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((shown) => !shown)}
                    className="tap-target absolute inset-y-0 right-0 flex items-center text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword?.message && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="text-center text-sm text-red-600">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground shadow-soft transition-all duration-200 ease-out hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-secondary-700 transition-colors duration-200 hover:text-secondary-800"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
