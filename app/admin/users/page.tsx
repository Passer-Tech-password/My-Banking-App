"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserTable, { UserData } from "@/components/UserTable";
import FundUserModal from "@/components/FundUserModal";
import CreateUserModal from "@/components/CreateUserModal";
import { useToast } from "@/components/ToastProvider";
import { MagnifyingGlassIcon, ArrowDownTrayIcon, PlusIcon } from "@heroicons/react/24/outline";

type AdminUsersAPI = {
  ok: true;
  users: (UserData & { uid: string })[];
  admin: { email: string };
};

export default function UsersPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [authChecking, setAuthChecking] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fund Modal State
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // Create User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });
        if (res.ok) {
          if (!cancelled) {
            setAuthChecking(false);
            fetchUsers(true);
          }
        } else {
          if (!cancelled) {
            setAuthChecking(false);
          }
          if (!cancelled && typeof window !== "undefined") {
            window.location.href = "/admin/login";
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
        if (!cancelled) {
          setAuthChecking(false);
        }
        if (!cancelled && typeof window !== "undefined") {
          window.location.href = "/admin/login";
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async (_reset: boolean = false) => {
    try {
      setError(null);
      setUsersLoading(true);
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null as unknown);
        const msg =
          body && typeof body === "object" && "error" in body && typeof (body as any).error === "string"
            ? (body as any).error as string
            : `HTTP ${res.status}`;
        if (res.status === 401) {
          setError("Admin session expired. Re-signing in…");
          if (typeof window !== "undefined") window.location.href = "/admin/login";
          return;
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as AdminUsersAPI;
      if (!data.ok) {
        throw new Error("Server returned not-ok status.");
      }
      const shaped: UserData[] = data.users.map((u) => {
        const createdAt =
          typeof u.createdAt === "string" && u.createdAt
            ? new Date(u.createdAt)
            : u.createdAt && typeof u.createdAt === "object" && "seconds" in (u.createdAt as any)
              ? (u.createdAt as any)
              : undefined;
        return {
          id: u.uid,
          uid: u.uid,
          firstName: typeof u.firstName === "string" ? u.firstName : "",
          middleName: typeof u.middleName === "string" ? u.middleName : "",
          lastName: typeof u.lastName === "string" ? u.lastName : "",
          displayName: typeof u.displayName === "string" ? u.displayName : "",
          email: typeof u.email === "string" ? u.email : "",
          photoURL: typeof u.photoURL === "string" ? u.photoURL : undefined,
          accountNumber: typeof u.accountNumber === "string" ? u.accountNumber : "",
          balance: typeof u.balance === "number" ? u.balance : Number(u.balance ?? 0) || 0,
          accountStatus:
            typeof u.accountStatus === "string"
              ? (u.accountStatus as any)
              : "ACTIVE",
          blocked: typeof u.blocked === "boolean" ? u.blocked : false,
          role: typeof u.role === "string" ? u.role : "user",
          createdAt: createdAt as any,
        };
      });
      setUsers(shaped);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err instanceof Error
          ? `Failed to load users: ${err.message}`
          : "Failed to load users. Please try again later.",
      );
    } finally {
      setUsersLoading(false);
    }
  };

  type AdminActionName = "suspend" | "activate" | "block" | "close" | "delete";

  const confirmWithReason = (action: AdminActionName, user: UserData): { ok: boolean; reason: string } => {
    const labels: Record<AdminActionName, { title: string; prompt: string }> = {
      suspend: {
        title: `Suspend account for ${user.email}?`,
        prompt: "Optional reason for suspension (saved to audit log):",
      },
      activate: {
        title: `Activate / unblock account for ${user.email}?`,
        prompt: "Optional note for activation (saved to audit log):",
      },
      block: {
        title: `Block account for ${user.email}?`,
        prompt: "Optional reason for block (saved to audit log):",
      },
      close: {
        title: `PERMANENTLY CLOSE account for ${user.email}? Closed accounts cannot be reopened.`,
        prompt: "Reason for closing this account (saved to audit log, recommend documenting):",
      },
      delete: {
        title: `PERMANENTLY DELETE all data for ${user.email}? This will erase user profile, public profile, and Firebase Auth record — IRREVERSIBLE.`,
        prompt: "Confirm deletion reason (required for audit trail):",
      },
    };
    const meta = labels[action];
    const confirmed = window.confirm(meta.title);
    if (!confirmed) return { ok: false, reason: "" };
    const reason = window.prompt(meta.prompt, "") ?? "";
    return { ok: true, reason: reason.trim() };
  };

  const performAction = async (
    action: AdminActionName,
    userId: string,
    user: UserData,
    skipReasonPrompt: boolean = false,
  ) => {
    const confirmation = skipReasonPrompt
      ? { ok: true, reason: "" }
      : confirmWithReason(action, user);
    if (!confirmation.ok) return;

    try {
      const res = await fetch("/api/admin/users/action", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          uid: userId,
          action,
          reason: confirmation.reason,
        }),
      });
      const text = await res.text().catch(() => "");
      const bodyRaw = text ? JSON.parse(text) : null;
      const obj: Record<string, unknown> | null =
        bodyRaw && typeof bodyRaw === "object" ? (bodyRaw as Record<string, unknown>) : null;
      const bodyOk = obj && typeof obj.ok === "boolean" ? obj.ok : false;
      if (!res.ok || !bodyOk) {
        const msg =
          obj && typeof obj.error === "string"
            ? obj.error
            : `Failed (HTTP ${res.status})`;
        if (res.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/admin/login";
          return;
        }
        toast.error(msg);
        return;
      }
      const successMsg =
        obj && typeof obj.message === "string"
          ? obj.message
          : `Action "${action}" completed.`;

      if (action === "delete") {
        setUsers((prev) => prev.filter((u) => (u.uid || u.id) !== userId));
      } else {
        setUsers((prev) =>
          prev.map((u) => {
            if ((u.uid || u.id) !== userId) return u;
            if (action === "activate") {
              return { ...u, blocked: false, accountStatus: "ACTIVE" };
            }
            if (action === "suspend") {
              return { ...u, blocked: true, accountStatus: "SUSPENDED" };
            }
            if (action === "block") {
              return { ...u, blocked: true };
            }
            if (action === "close") {
              return { ...u, blocked: true, accountStatus: "CLOSED" };
            }
            return u;
          }),
        );
      }
      toast.success(successMsg);
    } catch (e) {
      console.error(`ADMIN ACTION ${action} FAILED for uid=${userId}:`, e);
      toast.error("Network error. Action not recorded.");
    }
  };

  const handleViewUser = (user: UserData) => {
    const id = user.uid || user.id;
    router.push(`/admin/users/${encodeURIComponent(id)}`);
  };

  const openFundModal = (user: UserData) => {
    setSelectedUser(user);
    setFundModalOpen(true);
  };

  const handleFundSuccess = (updatedUser: UserData) => {
    setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  const handleCreateUserSuccess = (_createdUser: unknown) => {
    fetchUsers(true);
    toast.success("User account created successfully.");
  };

  const filteredUsers = users.filter((user) =>
    (user.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.lastName ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    if (users.length === 0) return;

    try {
      setExporting(true);
      const headers = ["ID", "Email", "Name", "Role", "Balance", "Blocked", "Created At"];
      const sanitize = (str: string | null | undefined) => {
        if (!str) return '""';
        return `"${String(str).replace(/"/g, '""').replace(/^([=+\-@\t\r])/, "'$1")}"`;
      };

      const rows = users.map((user) => [
        sanitize(user.id),
        sanitize(user.email),
        sanitize(`${user.firstName || ""} ${user.lastName || ""}`),
        sanitize(user.role),
        (user.balance || 0).toFixed(2),
        user.blocked ? "Yes" : "No",
        sanitize(
          user.createdAt
            ? user.createdAt instanceof Date
              ? user.createdAt.toLocaleDateString()
              : typeof (user.createdAt as any)?.seconds === "number"
                ? new Date((user.createdAt as any).seconds * 1000).toLocaleDateString()
                : String(user.createdAt)
            : "",
        ),
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "users.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">All Users</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Create User
            </button>
            <button
              onClick={exportToCSV}
              disabled={users.length === 0 || exporting}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <span className="inline-block h-4 w-4 border-b-2 border-gray-600 rounded-full animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="w-4 h-4" />
              )}
              {exporting ? "Exporting..." : "Export"}
            </button>
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>
            {usersLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block h-4 w-4 border-b-2 border-blue-500 rounded-full animate-spin" />
                <span>Loading users...</span>
              </div>
            )}
          </div>
        </div>

        <UserTable
          users={filteredUsers}
          onFund={openFundModal}
          onView={handleViewUser}
          onSuspend={(uid, user) => performAction("suspend", uid, user)}
          onActivate={(uid, user) => performAction("activate", uid, user)}
          onBlock={(uid, user) => performAction("block", uid, user)}
          onClose={(uid, user) => performAction("close", uid, user)}
          onDelete={(uid, user) => performAction("delete", uid, user)}
        />
      </div>

      {/* Fund Modal */}
      <FundUserModal
        isOpen={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        user={selectedUser}
        onSuccess={handleFundSuccess}
      />

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleCreateUserSuccess}
      />
    </div>
  );
}
