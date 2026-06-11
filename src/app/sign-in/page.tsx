"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useSignIn } from "@/lib/data-hooks/useSignIn";
import Image from "next/image";
import roninLogo from "@/public/ronin_logo.jpg";

interface SignInForm {
  email: string;
  password: string;
}

export default function SignIn() {
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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
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
                    )}
                  </button>
                </div>
                {errors.password?.message && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
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
        </div>
      </div>
    </div>
  );
}
