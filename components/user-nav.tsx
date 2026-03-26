"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AccountPayload {
  user: {
    id: string;
    email: string | null;
  };
  account: {
    plan: "free" | "pro" | "premium";
  };
}

const planTone = {
  free: "border-slate-200 bg-slate-100 text-slate-700",
  pro: "border-sky-200 bg-sky-100 text-sky-800",
  premium: "border-emerald-200 bg-emerald-100 text-emerald-800",
};

export function UserNav() {
  const [account, setAccount] = useState<AccountPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/account");
        if (!response.ok) {
          setAccount(null);
          return;
        }

        const payload = (await response.json()) as AccountPayload;
        setAccount(payload);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return <span className="text-xs text-slate-500">Loading...</span>;
  }

  if (!account) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="text-sm font-semibold text-slate-700">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${planTone[account.account.plan]}`}
      >
        {account.account.plan}
      </span>
      <Link href="/dashboard" className="text-sm font-semibold text-slate-700">
        Dashboard
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}
