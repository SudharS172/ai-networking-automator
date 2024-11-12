"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  Phone,
  UserCircle,
  Settings,
  MessageSquare,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const [activePage, setActivePage] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-blue-600">
                  AI Networking
                </h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 px-3">{session?.user?.name}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white h-screen shadow-lg">
          <nav className="mt-5 px-2">
            <Link
              href="/dashboard"
              className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activePage === "dashboard"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActivePage("dashboard")}
            >
              <Users className="mr-3 h-6 w-6" />
              Matches
            </Link>

            <Link
              href="/dashboard/calls"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activePage === "calls"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActivePage("calls")}
            >
              <Phone className="mr-3 h-6 w-6" />
              Call History
            </Link>

            <Link
              href="/dashboard/profile"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activePage === "profile"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActivePage("profile")}
            >
              <UserCircle className="mr-3 h-6 w-6" />
              Profile
            </Link>

            <Link
              href="/dashboard/messages"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activePage === "messages"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActivePage("messages")}
            >
              <MessageSquare className="mr-3 h-6 w-6" />
              Messages
            </Link>

            <Link
              href="/dashboard/settings"
              className={`mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                activePage === "settings"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              onClick={() => setActivePage("settings")}
            >
              <Settings className="mr-3 h-6 w-6" />
              Settings
            </Link>

            <button
              onClick={() => signOut()}
              className="mt-1 group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 w-full text-left"
            >
              <LogOut className="mr-3 h-6 w-6" />
              Sign Out
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">{children}</div>
      </div>
    </div>
  );
}
