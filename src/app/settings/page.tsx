"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import CreateUserModal from "@/components/CreateUserModal";
import {
  User as UserIcon,
  Shield,
  Trash2,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
  Plus,
  Home,
} from "lucide-react";
import Button from "@/components/Button";
import { Role } from "@prisma/client";

const SettingsPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    bio: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    theme: "light",
    currency: "USD",
    notifications: {
      email: true,
      push: false,
      weekly: true,
      monthly: true,
    },
  });

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "security", label: "Security", icon: Shield },
    // { id: "preferences", label: "Preferences", icon: Palette },
    // { id: "notifications", label: "Notifications", icon: Bell },
    // { id: "billing", label: "Billing", icon: CreditCard },
  ];

  // Add Users tab for admin users
  if (session?.user?.role === Role.ADMIN) {
    tabs.push({ id: "users", label: "Users", icon: Users });
  }

  const handleProfileSave = () => {
    // TODO: Implement profile update logic
    setIsEditingProfile(false);
  };

  const handlePasswordChange = () => {
    // TODO: Implement password change logic
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion logic
    setIsDeletingAccount(false);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" });
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and security"
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "bg-secondary text-black/90"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border bg-white shadow-sm">
                {/* Profile Tab */}
                {activeTab === "profile" && (
                  <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Profile Information
                      </h2>
                      {!isEditingProfile && (
                        <button
                          onClick={() => setIsEditingProfile(true)}
                          className="inline-flex items-center rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-black/90 shadow-sm transition-colors hover:bg-accent"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </button>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                name: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                email: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Bio
                          </label>
                          <textarea
                            value={profileForm.bio}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                bio: e.target.value,
                              })
                            }
                            rows={3}
                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleProfileSave}
                            className="inline-flex items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-black/90 shadow-sm transition-colors hover:bg-accent"
                          >
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </button>
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {profileForm.name}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {profileForm.email}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Bio
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {profileForm.bio || "No bio added yet."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Back to Welcome Section */}
                    <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-2 text-lg font-medium text-gray-900">
                        Getting Started
                      </h3>
                      <p className="mb-4 text-sm text-gray-600">
                        Need help setting up your account? Return to the welcome
                        page to access setup options.
                      </p>
                      <Button onClick={() => router.push("/welcome")}>
                        <Home className="mr-2 h-4 w-4" />
                        Back to Welcome Page
                      </Button>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                  <div className="p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                      Security Settings
                    </h2>

                    <div className="space-y-6">
                      {/* Change Password */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Change Password
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Current Password
                            </label>
                            <div className="relative mt-1">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={passwordForm.currentPassword}
                                onChange={(e) =>
                                  setPasswordForm({
                                    ...passwordForm,
                                    currentPassword: e.target.value,
                                  })
                                }
                                className="block w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  newPassword: e.target.value,
                                })
                              }
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm({
                                  ...passwordForm,
                                  confirmPassword: e.target.value,
                                })
                              }
                              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={handlePasswordChange}
                            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-black/90 shadow-sm transition-colors hover:bg-accent"
                          >
                            Update Password
                          </button>
                        </div>
                      </div>

                      {/* Sign Out */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Session Management
                        </h3>
                        <button
                          onClick={handleSignOut}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                        >
                          Sign Out
                        </button>
                      </div>

                      {/* Delete Account */}
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <h3 className="mb-4 text-lg font-medium text-red-900">
                          Delete Account
                        </h3>
                        <p className="mb-4 text-sm text-red-700">
                          This action cannot be undone. This will permanently
                          delete your account and remove all your data.
                        </p>
                        <button
                          onClick={() => setIsDeletingAccount(true)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                        >
                          <Trash2 className="mr-2 inline h-4 w-4" />
                          Delete Account
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === "preferences" && (
                  <div className="p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                      Preferences
                    </h2>

                    <div className="space-y-6">
                      {/* Theme */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Theme
                        </h3>
                        <div className="space-y-2">
                          {["light", "dark", "system"].map((theme) => (
                            <label
                              key={theme}
                              className="flex cursor-pointer items-center space-x-3"
                            >
                              <input
                                type="radio"
                                name="theme"
                                value={theme}
                                checked={preferences.theme === theme}
                                onChange={(e) =>
                                  setPreferences({
                                    ...preferences,
                                    theme: e.target.value,
                                  })
                                }
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm capitalize text-gray-700">
                                {theme}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Currency */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Currency
                        </h3>
                        <select
                          value={preferences.currency}
                          onChange={(e) =>
                            setPreferences({
                              ...preferences,
                              currency: e.target.value,
                            })
                          }
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === "notifications" && (
                  <div className="p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                      Notification Settings
                    </h2>

                    <div className="space-y-6">
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Email Notifications
                        </h3>
                        <div className="space-y-4">
                          {Object.entries(preferences.notifications).map(
                            ([key, value]) => (
                              <label
                                key={key}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm font-medium capitalize text-gray-700">
                                  {key.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                <input
                                  type="checkbox"
                                  checked={value}
                                  onChange={(e) =>
                                    setPreferences({
                                      ...preferences,
                                      notifications: {
                                        ...preferences.notifications,
                                        [key]: e.target.checked,
                                      },
                                    })
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Tab */}
                {activeTab === "billing" && (
                  <div className="p-6">
                    <h2 className="mb-6 text-xl font-semibold text-gray-900">
                      Billing & Subscription
                    </h2>

                    <div className="space-y-6">
                      {/* Current Plan */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Current Plan
                        </h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Free Plan
                            </p>
                            <p className="text-sm text-gray-500">
                              Basic features included
                            </p>
                          </div>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Payment Method
                        </h3>
                        <p className="text-sm text-gray-500">
                          No payment method added yet.
                        </p>
                        <button className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-black/90 shadow-sm transition-colors hover:bg-accent">
                          Add Payment Method
                        </button>
                      </div>

                      {/* Billing History */}
                      <div className="rounded-lg border border-gray-200 p-4">
                        <h3 className="mb-4 text-lg font-medium text-gray-900">
                          Billing History
                        </h3>
                        <p className="text-sm text-gray-500">
                          No billing history available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === "users" && (
                  <div className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900">
                        User Management
                      </h2>
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="inline-flex items-center rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-black/90 shadow-sm transition-colors hover:bg-accent"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                      </button>
                    </div>

                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">
                        Account Users
                      </h3>
                      <p className="text-sm text-gray-500">
                        Manage users in your account. Only administrators can
                        create new users.
                      </p>
                      <div className="mt-4 rounded-md bg-blue-50 p-3">
                        <p className="text-sm text-blue-700">
                          <strong>Note:</strong> New users are created with a
                          default password that you&apos;ll need to share with
                          them manually.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {isDeletingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center">
              <AlertTriangle className="mr-3 h-6 w-6 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900">
                Delete Account
              </h3>
            </div>
            <p className="mb-6 text-sm text-gray-500">
              Are you sure you want to delete your account? This action cannot
              be undone and will permanently remove all your data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700"
              >
                Delete Account
              </button>
              <button
                onClick={() => setIsDeletingAccount(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
