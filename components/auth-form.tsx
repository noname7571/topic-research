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
      <svg viewBox="0 0 18 18" aria-hidden="true" className="h-4 w-4">
        <path
          fill="#4285F4"
          d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9086c1.7027-1.5673 2.6837-3.8741 2.6837-6.6155z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.4673-.8068 5.9564-2.1809l-2.9086-2.2582c-.8068.5409-1.8409.8604-3.0477.8604-2.3441 0-4.3282-1.5832-5.0373-3.7091H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.9627 10.7123C3.7827 10.1714 3.6805 9.5932 3.6805 9s.1022-1.1714.2822-1.7123V4.9555H.9573C.3477 6.1705 0 7.5441 0 9s.3477 2.8295.9573 4.0445l3.0054-2.3322z"
        />
        <path
          fill="#EA4335"
          d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5814-2.5814C13.4632.8918 11.4268 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9555l3.0054 2.3322C4.6718 5.1623 6.6559 3.5795 9 3.5795z"
        />
      </svg>
    ),
  },
  {
    provider: "apple",
    label: "Continue with Apple",
    icon: (
      <svg viewBox="0 0 384 512" aria-hidden="true" className="h-4 w-4 fill-slate-900">
        <path d="M318.7 268.1c-.3-36.7 16.3-64.5 50.9-85.7-19.4-27.8-48.5-43.1-87.1-45.7-36.5-2.8-76.3 21.4-90.9 21.4-15.5 0-50.9-20.4-78.7-20.4C54.7 138.4 0 185.3 0 279.2c0 27.8 5.1 56.6 15.3 86.4 13.6 39.4 62.7 136.2 114 134.6 26.8-.7 45.7-19 80.6-19 33.9 0 51.5 19 80.7 19 51.8-.7 96.2-90.6 109.1-130.1-74.4-35.1-81-99.9-81-102.9zM260.5 102.4c28-33.2 25.4-63.4 24.5-74.4-24.7 1.4-53.3 16.8-69.6 35.8-17.9 20.6-28.4 46-26.1 74.3 26.8 2.1 50.9-11.5 71.2-35.7z" />
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
        if (/unsupported provider|not enabled/i.test(error.message)) {
          setMessage(
            "This OAuth provider is not enabled in your Supabase project. Enable it in Authentication -> Providers and add OAuth credentials.",
          );
        } else {
          setMessage(error.message);
        }
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

      <p className="mt-5 text-center text-xs text-slate-500">
        By continuing, you agree to our{" "}
        <Link href="/legal?view=terms" className="font-semibold text-slate-700 underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal?view=privacy" className="font-semibold text-slate-700 underline">
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}
