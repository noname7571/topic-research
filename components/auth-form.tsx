"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  const submitLabel = mode === "login" ? "Sign in" : "Create account";
  const heading = mode === "login" ? "Welcome back" : "Create your account";

  const isDisabled = useMemo(() => {
    return status === "loading" || email.trim().length < 5 || password.length < 6;
  }, [email, password, status]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isDisabled) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
        router.push(nextPath);
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("success");
      setMessage("Account created. Verify your email to activate your account, then sign in.");
    } catch {
      setStatus("error");
      setMessage("Unable to complete authentication right now.");
    }
  };

  return (
    <section className="mx-auto mt-12 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{heading}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {mode === "login"
          ? "Access your discourse intelligence workspace."
          : "Start with free signal previews and upgrade for full intelligence."}
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

        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
            required
            minLength={6}
          />
        </label>

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {status === "loading" ? "Please wait..." : submitLabel}
        </button>
      </form>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-rose-700" : "text-emerald-700"
          }`}
        >
          {message}
        </p>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        {mode === "login" ? "No account yet? " : "Already have an account? "}
        <Link
          href={mode === "login" ? "/signup" : "/login"}
          className="font-semibold text-slate-900 underline"
        >
          {mode === "login" ? "Create one" : "Sign in"}
        </Link>
      </p>

      {mode === "login" ? (
        <p className="mt-2 text-sm text-slate-600">
          Forgot password?{" "}
          <Link href="/forgot-password" className="font-semibold text-slate-900 underline">
            Reset it here
          </Link>
        </p>
      ) : null}
    </section>
  );
}
