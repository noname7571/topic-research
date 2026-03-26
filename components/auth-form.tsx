"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Provider } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface AuthFormProps {
  mode: "login" | "signup";
}

const oauthProviders: Array<{
  provider: Provider;
  label: string;
  icon: ReactNode;
}> = [
  {
    provider: "google",
    label: "Continue with Google",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6.1-2.8-6.1-6.1s2.8-6.1 6.1-6.1c1.9 0 3.2.8 4 1.5l2.7-2.6C17 2.9 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.3-.2-2H12z"
        />
      </svg>
    ),
  },
  {
    provider: "apple",
    label: "Continue with Apple",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
        <path d="M16.8 12.8c0-2.1 1.7-3.2 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2-.9 1.6-.2 4.1.7 5.5.5.7 1.1 1.5 2 1.5.8 0 1.1-.5 2.1-.5s1.3.5 2.2.5c.9 0 1.4-.8 1.9-1.5.6-.9.9-1.8.9-1.9-.1 0-1.4-.5-1.4-2.8zm-2.1-6.2c.4-.5.7-1.2.6-1.9-.6 0-1.3.4-1.8.9-.4.5-.8 1.2-.7 1.9.7.1 1.4-.3 1.9-.9z" />
      </svg>
    ),
  },
  {
    provider: "azure",
    label: "Continue with Microsoft",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path fill="#F25022" d="M2 2h9v9H2z" />
        <path fill="#00A4EF" d="M13 2h9v9h-9z" />
        <path fill="#7FBA00" d="M2 13h9v9H2z" />
        <path fill="#FFB900" d="M13 13h9v9h-9z" />
      </svg>
    ),
  },
];

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<Provider | null>(null);
  const [message, setMessage] = useState("");

  const submitLabel = mode === "login" ? "Sign in" : "Create account";
  const heading = mode === "login" ? "Welcome back" : "Create your account";

  const isDisabled = useMemo(() => {
    return (
      status === "loading" ||
      oauthLoadingProvider !== null ||
      email.trim().length < 5 ||
      password.length < 6
    );
  }, [email, oauthLoadingProvider, password, status]);

  const handleOAuth = async (provider: Provider) => {
    if (status === "loading" || oauthLoadingProvider) {
      return;
    }

    setOauthLoadingProvider(provider);
    setStatus("idle");
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const nextPath = new URLSearchParams(window.location.search).get("next") || "/dashboard";
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
      }
    } catch {
      setStatus("error");
      setMessage("Unable to start OAuth sign-in right now.");
    } finally {
      setOauthLoadingProvider(null);
    }
  };

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

      {mode === "login" ? (
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Or continue with
          </p>
          <div className="space-y-2">
            {oauthProviders.map((item) => (
              <button
                key={item.provider}
                type="button"
                onClick={() => void handleOAuth(item.provider)}
                disabled={status === "loading" || oauthLoadingProvider !== null}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.icon}
                <span>
                  {oauthLoadingProvider === item.provider ? "Redirecting..." : item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
