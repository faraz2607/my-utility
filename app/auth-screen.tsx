"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

type User = { id: string; name: string; email: string };

export default function AuthScreen({
  onAuthenticated,
  initialError = "",
}: {
  onAuthenticated: (user: User) => void;
  initialError?: string;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const body = Object.fromEntries(values.entries());
    if (mode === "signup" && values.get("password") !== values.get("confirmPassword")) {
      setError("Your passwords don't match.");
      setBusy(false);
      return;
    }
    delete body.confirmPassword;
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't complete that request.");
      onAuthenticated(data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't reach the account service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <section className="auth-art">
          <a className="brand auth-brand" href="#home">
            <span className="brand-mark">p</span>
            <span>
              pocket<span className="brand-light">wise</span>
            </span>
          </a>
          <div className="auth-art-copy">
            <span className="auth-overline">YOUR MONEY, A LITTLE CLEARER</span>
            <h1>
              More calm.
              <br />
              Less money fog.
            </h1>
            <p>A personal space to understand your everyday spending and feel good about where it goes.</p>
          </div>
          <div className="auth-orbit auth-orbit-a" />
          <div className="auth-orbit auth-orbit-b" />
          <div className="auth-art-foot">
            A LITTLE MORE CLARITY, EVERY DAY{" "}
            <span>
              <Sparkles size={15} />
            </span>
          </div>
        </section>
        <section className="auth-form-side">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand">
              <span className="brand-mark">p</span>
              <span>
                pocket<span className="brand-light">wise</span>
              </span>
            </div>
            <div className="auth-kicker">YOUR PERSONAL FINANCE SPACE</div>
            <h2>{mode === "login" ? "Welcome back" : "Make it personal"}</h2>
            <p className="auth-intro">
              {mode === "login"
                ? "Sign in to pick up where you left off."
                : "Create your private space to start tracking."}
            </p>
            <form onSubmit={submit} className="auth-form">
              {mode === "signup" && (
                <label>
                  Your name
                  <input
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                    placeholder="What should we call you?"
                  />
                </label>
              )}
              <label>
                Email address
                <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={mode === "signup" ? 8 : undefined}
                  maxLength={128}
                  required
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                />
              </label>
              {mode === "signup" && (
                <label>
                  Confirm password
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={128}
                    required
                    placeholder="Re-enter your password"
                  />
                </label>
              )}
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <button className="auth-submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
                <span>
                  <ArrowRight size={16} />
                </span>
              </button>
            </form>
            <p className="auth-switch">
              {mode === "login" ? "New to Pocketwise?" : "Already have an account?"}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                }}
              >
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
            <div className="auth-privacy">
              <span>
                <ShieldCheck size={15} />
              </span>{" "}
              Your financial details are private to your account.
            </div>
          </div>
        </section>
      </div>
      <div className="auth-bottom-note">
        POCKETWISE <span>·</span> YOUR PERSONAL SPACE
      </div>
    </main>
  );
}
