"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, LogOut } from "lucide-react";
import { useAuth } from "../components/AuthProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Overview" },
    { href: "/dashboard/conversations", icon: <MessageSquare size={20} />, label: "Conversations" },
    { href: "/dashboard/settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <span className="text-sm font-semibold text-white tracking-wide">Bystander</span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1">
          {navItems.map((item) => {
            // Very simple active check
            const isActive = item.href === "/dashboard" 
              ? pathname === "/dashboard" 
              : pathname.startsWith(item.href);
              
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-accent/20 text-accent-light text-white" 
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs uppercase border border-slate-700">
              {user?.name?.substring(0, 2) || "U"}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white truncate max-w-[120px]">{user?.name}</span>
              <span className="text-xs text-slate-500 truncate max-w-[120px]">{user?.email}</span>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut size={18} />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
