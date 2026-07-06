"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import { Eye, EyeOff, Lock } from "lucide-react";
import Button from "@/components/Button";
import { useChangePassword } from "@/lib/data-hooks/users/useChangePassword";

const initialFormState = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

type PasswordField = keyof typeof initialFormState;

const ChangePasswordForm = () => {
  const [form, setForm] = useState(initialFormState);
  const [visibleFields, setVisibleFields] = useState<
    Record<PasswordField, boolean>
  >({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const changePasswordMutation = useChangePassword();

  const handleChange =
    (field: PasswordField) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const toggleVisibility = (field: PasswordField) => {
    setVisibleFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { currentPassword, newPassword, confirmPassword } = form;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError("All fields are required.");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setFormError(
        "New password must be different from your current password.",
      );
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword,
        newPassword,
      });
      toast.success("Password updated");
      setForm(initialFormState);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update password.";
      toast.error(message);
    }
  };

  const fields: Array<{
    field: PasswordField;
    label: string;
    autoComplete: string;
    minLength?: number;
  }> = [
    {
      field: "currentPassword",
      label: "Current password",
      autoComplete: "current-password",
    },
    {
      field: "newPassword",
      label: "New password",
      autoComplete: "new-password",
      minLength: 6,
    },
    {
      field: "confirmPassword",
      label: "Confirm new password",
      autoComplete: "new-password",
      minLength: 6,
    },
  ];

  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-gray-500">
          <Lock className="h-4 w-4" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-gray-900">
          Change password
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(({ field, label, autoComplete, minLength }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-500">
              {label}
            </label>
            <div className="relative mt-1">
              <input
                type={visibleFields[field] ? "text" : "password"}
                value={form[field]}
                onChange={handleChange(field)}
                required
                minLength={minLength}
                autoComplete={autoComplete}
                className="block w-full rounded-xl border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
              <button
                type="button"
                onClick={() => toggleVisibility(field)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                aria-label={
                  visibleFields[field] ? "Hide password" : "Show password"
                }
              >
                {visibleFields[field] ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        ))}

        {formError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-600">{formError}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" isLoading={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending
              ? "Updating..."
              : "Update password"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChangePasswordForm;
