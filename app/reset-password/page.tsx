"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const disabled = useMemo(() => {
    return (
      status === "loading" ||
      password.length < 8 ||
      confirm.length < 8 ||
      password !== confirm
    );
  }, [confirm, password, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");
      setMessage("Password updated successfully. You can now sign in.");
    } catch {
      setStatus("error");
      setMessage("Unable to update password right now.");
    }
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-2 text-sm text-slate-600">
        Choose a new password for your account.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          New password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            required
            minLength={8}
          />
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Confirm new password
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            required
            minLength={8}
          />
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === "loading" ? "Updating..." : "Update password"}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        Return to <Link href="/login" className="font-semibold text-slate-900 underline">Sign in</Link>
      </p>
    </section>
  );
}
