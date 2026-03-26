"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const disabled = useMemo(() => {
    return status === "loading" || email.trim().length < 5;
  }, [email, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (disabled) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");
      setMessage("Password reset link sent. Check your email.");
    } catch {
      setStatus("error");
      setMessage("Unable to send reset email right now.");
    }
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter your account email and we will send a secure reset link.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            required
          />
        </label>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === "loading" ? "Sending..." : "Send reset link"}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-rose-700" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        Back to <Link href="/login" className="font-semibold text-slate-900 underline">Sign in</Link>
      </p>
    </section>
  );
}
