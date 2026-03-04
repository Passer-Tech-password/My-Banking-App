import { 
  CheckCircleIcon, 
  NoSymbolIcon, 
  TrashIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";

export type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  balance?: number;
  accountType?: string;
  blocked?: boolean;
  createdAt?: { seconds: number; nanoseconds: number };
};

interface UserTableProps {
  users: UserData[];
  onToggleBlock: (userId: string, currentStatus?: boolean) => void;
  onDelete: (userId: string) => void;
  onFund: (user: UserData) => void;
}

export default function UserTable({ users, onToggleBlock, onDelete, onFund }: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
          <tr>
            <th className="px-6 py-4">User Info</th>
            <th className="px-6 py-4">Account Type</th>
            <th className="px-6 py-4">Balance</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {users.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                No users found matching your search.
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="capitalize">{user.accountType || "Standard"}</span>
                </td>
                <td className="px-6 py-4 font-mono font-medium text-gray-900">
                  ${user.balance?.toLocaleString() || "0.00"}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.blocked 
                      ? "bg-red-100 text-red-800" 
                      : "bg-green-100 text-green-800"
                  }`}>
                    {user.blocked ? "Blocked" : "Active"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onFund(user)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Fund Account"
                    >
                      <BanknotesIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onToggleBlock(user.id, user.blocked)}
                      className={`p-1.5 rounded-md transition-colors ${
                        user.blocked 
                          ? "text-green-600 hover:bg-green-50" 
                          : "text-amber-600 hover:bg-amber-50"
                      }`}
                      title={user.blocked ? "Unblock User" : "Block User"}
                    >
                      {user.blocked ? <CheckCircleIcon className="w-5 h-5" /> : <NoSymbolIcon className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => onDelete(user.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete User"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}