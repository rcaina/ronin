"use client";

import { useState } from "react";
import { X, UserIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCreateUser } from "@/lib/data-hooks/useCreateUser";
import { type CreateUserRequest } from "@/lib/data-hooks/services/auth";
import type { User as PrismaUser } from "@prisma/client";
import Button from "./Button";

interface CreatedUser {
  user: PrismaUser & {
    name: string;
  };
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateUserModal = ({ isOpen, onClose }: CreateUserModalProps) => {
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const {
    createUser,
    isLoading: isCreatingUser,
    error: createUserError,
    resetError,
  } = useCreateUser();

  const [createUserForm, setCreateUserForm] = useState<CreateUserRequest>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "MEMBER",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();

    try {
      const result = await createUser(createUserForm);
      setCreatedUser(result);
      setCreateUserForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "MEMBER",
      });
      onClose();
      toast.success("User created successfully!");
    } catch (error) {
      // Error is handled by the hook
      console.error("Error creating user:", error);
      toast.error("Failed to create user. Please try again.");
    }
  };

  const handleClose = () => {
    onClose();
    setCreatedUser(null);
    resetError();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Create User Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Create New User
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  value={createUserForm.firstName}
                  onChange={(e) =>
                    setCreateUserForm({
                      ...createUserForm,
                      firstName: e.target.value,
                    })
                  }
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  value={createUserForm.lastName}
                  onChange={(e) =>
                    setCreateUserForm({
                      ...createUserForm,
                      lastName: e.target.value,
                    })
                  }
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={createUserForm.email}
                  onChange={(e) =>
                    setCreateUserForm({
                      ...createUserForm,
                      email: e.target.value,
                    })
                  }
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={createUserForm.password}
                  onChange={(e) =>
                    setCreateUserForm({
                      ...createUserForm,
                      password: e.target.value,
                    })
                  }
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={createUserForm.role}
                onChange={(e) =>
                  setCreateUserForm({
                    ...createUserForm,
                    role: e.target.value as "ADMIN" | "MEMBER",
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {createUserError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{createUserError}</p>
              </div>
            )}

            <div className="flex w-full gap-2">
              <Button
                type="button"
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingUser}
                className="w-full"
              >
                {isCreatingUser ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Created User Success Modal */}
      {createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center">
              <div className="mr-3 rounded-full bg-green-100 p-2">
                <UserIcon className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                User Created Successfully
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-700">
                  <strong>User:</strong> {createdUser.user.name}
                </p>
                <p className="text-sm text-green-700">
                  <strong>Email:</strong> {createdUser.user.email}
                </p>
                <p className="text-sm text-green-700">
                  <strong>Role:</strong> {createdUser.user.role}
                </p>
              </div>
            </div>

            <Button onClick={handleClose}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateUserModal;
