"use client";

import { useState } from "react";
import { AlertTriangle, X, LogOut } from "lucide-react";
import Button from "@/components/Button";
import ButtonSpinner from "@/components/ButtonSpinner";
import { useLeaveAccount } from "@/lib/data-hooks/useDeactivateAccount";

interface LeaveAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaveAccountModal = ({ isOpen, onClose }: LeaveAccountModalProps) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { leaveAccount, isLoading, error } = useLeaveAccount();

  const expectedText = "DEACTIVATE";
  const isConfirmationValid = confirmationText === expectedText;
  const isPasswordValid = password.length >= 6;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleLeaveAccount = async () => {
    if (!isConfirmationValid || !isPasswordValid) return;

    try {
      await leaveAccount(password);
      // The hook handles sign out and redirect
    } catch {
      // Error is already handled by the hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="mr-3 h-6 w-6 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900">
              Deactivate Account
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <div className="rounded-lg bg-red-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-red-800">
              ⚠️ This action cannot be undone
            </h4>
            <p className="text-sm text-red-700">
              Deactivating your account will:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
              <li>Remove your access to this account</li>
              <li>Deactivate your user profile</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                To confirm, type{" "}
                <span className="rounded bg-gray-100 px-1 font-mono">
                  DEACTIVATE
                </span>{" "}
                below:
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type confirmation text here"
                disabled={isLoading}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Enter your password to confirm:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={isLoading}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none disabled:cursor-not-allowed"
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLeaveAccount}
            disabled={!isConfirmationValid || !isPasswordValid || isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <ButtonSpinner />
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Deactivate Account
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeaveAccountModal;
