import {
  CheckCircleIcon,
  NoSymbolIcon,
  TrashIcon,
  BanknotesIcon,
  PauseCircleIcon,
  XCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

export type UserAccountStatus = "ACTIVE" | "inactive" | "SUSPENDED" | "CLOSED";

export type UserData = {
  id: string;
  uid?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  email: string;
  photoURL?: string;
  accountNumber?: string;
  role?: string;
  balance?: number;
  accountType?: string;
  blocked?: boolean;
  accountStatus?: UserAccountStatus;
  createdAt?: { seconds: number; nanoseconds: number };
};

interface UserTableProps {
  users: UserData[];
  onToggleBlock?: (userId: string, currentStatus?: boolean) => void;
  onDelete: (userId: string, user: UserData) => void;
  onFund: (user: UserData) => void;
  onView?: (user: UserData) => void;
  onSuspend?: (userId: string, user: UserData) => void;
  onActivate?: (userId: string, user: UserData) => void;
  onBlock?: (userId: string, user: UserData) => void;
  onClose?: (userId: string, user: UserData) => void;
}

function effectiveStatus(user: UserData): UserAccountStatus {
  const explicit = user.accountStatus;
  if (explicit === "CLOSED") return "CLOSED";
  if (explicit === "SUSPENDED") return "SUSPENDED";
  if (user.blocked) return "SUSPENDED";
  if (explicit === "inactive") return "inactive";
  return "ACTIVE";
}

function statusBadge(user: UserData): { label: string; cls: string } {
  const s = effectiveStatus(user);
  switch (s) {
    case "CLOSED":
      return { label: "Closed", cls: "bg-red-100 text-red-800 border-red-200" };
    case "SUSPENDED":
      return { label: user.blocked ? "Blocked" : "Suspended", cls: "bg-amber-100 text-amber-800 border-amber-200" };
    case "inactive":
      return { label: "Inactive", cls: "bg-gray-100 text-gray-600 border-gray-200" };
    case "ACTIVE":
    default:
      return { label: "Active", cls: "bg-green-100 text-green-800 border-green-200" };
  }
}

export default function UserTable({
  users,
  onToggleBlock,
  onDelete,
  onFund,
  onView,
  onSuspend,
  onActivate,
  onBlock,
  onClose,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
          <tr>
            <th className="px-4 sm:px-6 py-4">User Info</th>
            <th className="px-4 sm:px-6 py-4">Account Type</th>
            <th className="px-4 sm:px-6 py-4">Balance</th>
            <th className="px-4 sm:px-6 py-4">Status</th>
            <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                No users found matching your search.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const status = effectiveStatus(user);
              const isClosed = status === "CLOSED";
              const isRestricted = status === "SUSPENDED" || status === "inactive" || user.blocked;
              const badge = statusBadge(user);
              const uid = user.uid || user.id;
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="capitalize">{user.accountType || "Standard"}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-mono font-medium text-gray-900">
                    ${user.balance?.toLocaleString() || "0.00"}
                  </td>
                  <td className="px-4 sm:px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {onView && (
                        <button
                          onClick={() => onView(user)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          title="View / Edit details"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onFund(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Fund Account"
                      >
                        <BanknotesIcon className="w-5 h-5" />
                      </button>
                      {!isClosed && !isRestricted && onSuspend && (
                        <button
                          onClick={() => onSuspend(uid, user)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Suspend account"
                        >
                          <PauseCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      {!isClosed && !isRestricted && onBlock && (
                        <button
                          onClick={() => onBlock(uid, user)}
                          className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                          title="Block account"
                        >
                          <NoSymbolIcon className="w-5 h-5" />
                        </button>
                      )}
                      {!isClosed && isRestricted && onActivate && (
                        <button
                          onClick={() => onActivate(uid, user)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Activate / Unblock account"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      {!isClosed && onToggleBlock && !onBlock && (
                        <button
                          onClick={() => onToggleBlock(uid, user.blocked)}
                          className={`p-1.5 rounded-md transition-colors ${
                            user.blocked
                              ? "text-green-600 hover:bg-green-50"
                              : "text-amber-600 hover:bg-amber-50"
                          }`}
                          title={user.blocked ? "Unblock User" : "Block User"}
                        >
                          {user.blocked ? (
                            <CheckCircleIcon className="w-5 h-5" />
                          ) : (
                            <NoSymbolIcon className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      {!isClosed && onClose && (
                        <button
                          onClick={() => onClose(uid, user)}
                          className="p-1.5 text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                          title="Permanently close account"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(uid, user)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Permanently delete account data"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
