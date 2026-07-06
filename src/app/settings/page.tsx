"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import SettingsPageNavigation from "@/components/settings/SettingsPageNavigation";
import CreateUserModal from "@/components/CreateUserModal";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import LeaveAccountModal from "@/components/DeactivateAccountModal";
import {
  User as UserIcon,
  Shield,
  Edit,
  Save,
  X,
  Users,
  Plus,
  Home,
  Trash2,
  LogOut,
  AlertTriangle,
  Palette,
  CreditCard,
} from "lucide-react";
import Button from "@/components/Button";
import { usePageLoading } from "@/components/ConditionalLayout";
import ThemeSelector from "@/components/settings/ThemeSelector";
import PlanComparison from "@/components/billing/PlanComparison";
import ChangePasswordForm from "@/components/settings/ChangePasswordForm";
import { Role } from "@prisma/client";
import { useUpdateProfile } from "@/lib/data-hooks/users/useUser";
import {
  useBillingStatus,
  useCheckout,
  useBillingPortal,
  billingStatusKey,
} from "@/lib/data-hooks/billing/useBilling";
import type { BillingInterval } from "@/lib/data-hooks/services/billing";

interface AccountUser {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
}

const getInitials = (name?: string | null) => {
  const initials = (name ?? "")
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "U";
};

const SettingsPageContent = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(() =>
    searchParams.get("tab") === "billing" ? "billing" : "profile",
  );
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showLeaveAccountModal, setShowLeaveAccountModal] = useState(false);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("year");
  const updateProfileMutation = useUpdateProfile();
  const { data: billingStatus, isLoading: billingLoading } = useBillingStatus();
  const checkoutMutation = useCheckout();
  const portalMutation = useBillingPortal();

  const isAdmin = session?.user?.role === Role.ADMIN;

  // Handle the redirect back from Stripe Checkout: toast on success/cancel,
  // refresh billing status, and strip `checkout` from the URL so a refresh
  // doesn't re-fire the toast.
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast.success("Welcome to Premium!");
      void queryClient.invalidateQueries({ queryKey: billingStatusKey });
    } else if (checkout === "cancelled") {
      toast("Checkout cancelled — you can upgrade anytime.");
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("checkout");
    const query = params.toString();
    router.replace(query ? `/settings?${query}` : "/settings", {
      scroll: false,
    });
    // Only run once on mount — re-running on every searchParams change would
    // re-toast after we strip `checkout` from the URL above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async () => {
    try {
      const { url } = await checkoutMutation.mutateAsync(billingInterval);
      window.location.assign(url);
    } catch (error) {
      console.error("Failed to start checkout:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again.",
      );
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { url } = await portalMutation.mutateAsync();
      window.location.assign(url);
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to open billing portal. Please try again.",
      );
    }
  };

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    role: session?.user?.role ?? "",
    phone: session?.user?.phone ?? "",
    bio: "",
  });

  // Update form when session changes
  useEffect(() => {
    if (session?.user) {
      setProfileForm({
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role ?? "",
        phone: session.user.phone ?? "",
        bio: "",
      });
    }
  }, [session]);

  // Account users (admin-only Users tab)
  const [accountUsers, setAccountUsers] = useState<AccountUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!isAdmin || activeTab !== "users") return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch("/api/users");
        if (!response.ok) throw new Error("Failed to fetch users");
        const data = (await response.json()) as AccountUser[];
        setAccountUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
        toast.error("Failed to load users. Please refresh the page.");
      } finally {
        setLoadingUsers(false);
      }
    };

    void fetchUsers();
  }, [isAdmin, activeTab, showCreateUserModal]);

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "preferences", label: "Preferences", icon: Palette },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
  ];

  // Add Users tab for admin users
  if (isAdmin) {
    tabs.push({ id: "users", label: "Users", icon: Users });
  }

  const handleProfileSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      setIsEditingProfile(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      // Error is handled by the mutation
      console.error("Failed to update profile:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/sign-in" });
  };

  usePageLoading(status === "loading", "Loading settings...");
  if (status === "loading") {
    return null;
  }

  return (
    <div className="flex flex-col bg-surface lg:h-screen">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and security"
      />

      <SettingsPageNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="pt-4 lg:flex-1 lg:overflow-auto lg:pt-0">
        <div className="mx-auto w-full px-4 py-4 pb-28 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-4 sm:space-y-6">
              {/* Identity summary */}
              <div className="card-surface flex items-center gap-4 p-5 sm:p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-lg font-semibold tracking-tight text-secondary-700">
                  {getInitials(profileForm.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-gray-900">
                    {profileForm.name || "Your account"}
                  </h2>
                  <p className="truncate text-sm text-gray-500">
                    {profileForm.email || "No email on file"}
                  </p>
                </div>
                {profileForm.role && (
                  <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium capitalize text-secondary-700">
                    {profileForm.role.toLowerCase()}
                  </span>
                )}
              </div>

              {/* Details + getting started fill the full width on desktop. */}
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
                {/* Profile information */}
                <div className="card-surface p-5 sm:p-6 lg:col-span-2">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold tracking-tight text-gray-900">
                      Profile information
                    </h3>
                    {!isEditingProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingProfile(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit profile
                      </Button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Full name
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
                            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
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
                            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) =>
                              setProfileForm({
                                ...profileForm,
                                phone: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500">
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
                          className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                        />
                      </div>

                      {updateProfileMutation.error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                          <p className="text-sm text-red-600">
                            {updateProfileMutation.error.message}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingProfile(false)}
                          disabled={updateProfileMutation.isPending}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          onClick={handleProfileSave}
                          isLoading={updateProfileMutation.isPending}
                        >
                          {!updateProfileMutation.isPending && (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {updateProfileMutation.isPending
                            ? "Saving..."
                            : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Full name
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profileForm.name || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Email
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profileForm.email || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Role
                        </label>
                        <p className="mt-1 text-sm capitalize text-gray-900">
                          {profileForm.role.toLowerCase() || "—"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">
                          Phone
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profileForm.phone || "—"}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500">
                          Bio
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {profileForm.bio || "No bio added yet."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Getting started */}
                <div className="card-surface flex flex-col p-5 sm:p-6">
                  <h3 className="text-base font-semibold tracking-tight text-gray-900">
                    Getting started
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Need help setting up your account? Return to the welcome
                    page to access setup options.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 w-full sm:mt-auto"
                    onClick={() => router.push("/welcome")}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Back to welcome page
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="card-surface p-5 sm:p-6">
                <div className="mb-1 flex items-center gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-gray-900">
                    Appearance
                  </h3>
                </div>
                <p className="mb-5 text-sm text-gray-600">
                  Choose how Ronin looks. Your choice is saved to your account,
                  so it stays the same the next time you sign in — on any
                  device.
                </p>
                <ThemeSelector />
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-4 sm:space-y-6">
              {billingLoading ? (
                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                  <div className="card-surface h-80 animate-pulse p-5 sm:p-6" />
                  <div className="card-surface h-80 animate-pulse p-5 sm:p-6" />
                </div>
              ) : billingStatus ? (
                <PlanComparison
                  billingStatus={billingStatus}
                  isAdmin={isAdmin}
                  interval={billingInterval}
                  onIntervalChange={setBillingInterval}
                  onUpgrade={handleUpgrade}
                  upgrading={checkoutMutation.isPending}
                  onManage={handleManageSubscription}
                  managing={portalMutation.isPending}
                />
              ) : (
                <div className="card-surface p-5 sm:p-6">
                  <p className="text-sm text-gray-500">
                    Couldn&apos;t load billing information. Please refresh the
                    page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Change password */}
              <ChangePasswordForm />

              {/* Session management */}
              <div className="card-surface p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold tracking-tight text-gray-900">
                      Session management
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Sign out of your account on this device.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </div>

              {/* Danger zone */}
              <div className="rounded-2xl border border-danger-border bg-danger-surface p-5 shadow-card sm:p-6 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-gray-900">
                    {isAdmin ? "Delete account" : "Deactivate account"}
                  </h3>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      isAdmin
                        ? setShowDeleteAccountModal(true)
                        : setShowLeaveAccountModal(true)
                    }
                  >
                    {isAdmin ? (
                      <Trash2 className="mr-2 h-4 w-4" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    {isAdmin ? "Delete account" : "Deactivate account"}
                  </Button>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-icon-bg text-danger-icon">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-gray-600">
                    {isAdmin
                      ? "Permanently delete your account and all associated data. This action cannot be undone and will remove all your budgets, transactions, categories, and other data."
                      : "Remove your access from this account. This action cannot be undone and will deactivate your user profile and prevent you from logging in. Your personal data (transactions, cards, income) will be preserved for account history, while the account and other users remain."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-4 sm:space-y-6">
              <div className="card-surface p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-gray-900">
                    Account users
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowCreateUserModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add user
                  </Button>
                </div>

                {loadingUsers ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-xl bg-surface-muted"
                      />
                    ))}
                  </div>
                ) : accountUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No users yet — add your first one.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-200/70">
                    {accountUsers.map((user) => (
                      <li
                        key={user.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-sm font-semibold text-secondary-700">
                          {getInitials(
                            user.name ??
                              `${user.firstName ?? ""} ${user.lastName ?? ""}`,
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {user.name ??
                              (`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                                "Unnamed user")}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {user.email ?? "No email"}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium capitalize text-gray-600">
                          {user.role.toLowerCase()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-5 rounded-xl bg-secondary-50 p-3">
                  <p className="text-sm text-secondary-800">
                    <strong>Note:</strong> New users are created with a default
                    password that you&apos;ll need to share with them manually.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
        />
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <DeleteAccountModal
          isOpen={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
        />
      )}

      {/* Leave Account Modal */}
      {showLeaveAccountModal && (
        <LeaveAccountModal
          isOpen={showLeaveAccountModal}
          onClose={() => setShowLeaveAccountModal(false)}
        />
      )}
    </div>
  );
};

const SettingsPage = () => (
  <Suspense fallback={null}>
    <SettingsPageContent />
  </Suspense>
);

export default SettingsPage;
