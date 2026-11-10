"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button, Field, inputCls } from "./ui";
import { Logo } from "./Shell";

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    setNotice("");
    const origin = window.location.origin;
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() }, emailRedirectTo: origin },
        });
        if (error) throw error;
        if (!data.session) setNotice(`Check ${email} for a confirmation link, then come back and sign in.`);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: origin });
        if (error) throw error;
        setNotice(`If ${email} has an account, a reset link is on its way.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        /invalid login/i.test(msg)
          ? "That email and password don't match. Check for typos, or reset your password."
          : /already registered/i.test(msg)
            ? "That email already has an account. Sign in instead."
            : /email not confirmed/i.test(msg)
              ? "Confirm your email first — open the link we sent, then sign in."
              : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signin" ? "Welcome back." : mode === "signup" ? "Start your own journal." : "Reset your password.";

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <Logo />
        <h1 className="mt-10 font-serif text-[2.25rem] leading-tight tracking-[-0.01em]">{title}</h1>
        <p className="mt-2 text-muted">
          {mode === "signup"
            ? "Each person gets a private account. Entries stay yours unless you choose to send one to your partner."
            : mode === "forgot"
              ? "We'll email you a link to set a new one."
              : "Your journal is private to you."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <Field label="Your first name" hint="Shown to your partner when you share an entry.">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" required />
            </Field>
          )}
          <Field label="Email">
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          {mode !== "forgot" && (
            <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
              <input
                className={inputCls}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                required
              />
            </Field>
          )}

          {error && <p role="alert" className="rounded-xl bg-ember-soft px-4 py-3 text-[15px] text-ember">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-tide-soft px-4 py-3 text-[15px] text-tide-deep">{notice}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "One moment…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-[15px]">
          {mode === "signin" && (
            <>
              <p>
                New here?{" "}
                <button className="font-medium text-tide hover:underline" onClick={() => setMode("signup")}>Create an account</button>
              </p>
              <p>
                <button className="text-muted hover:text-tide hover:underline" onClick={() => setMode("forgot")}>Forgot your password?</button>
              </p>
            </>
          )}
          {mode !== "signin" && (
            <p>
              Have an account?{" "}
              <button className="font-medium text-tide hover:underline" onClick={() => setMode("signin")}>Sign in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shown after following a password-reset email link. */
export function NewPasswordScreen() {
  const { doneRecovering } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <form
        className="w-full max-w-[420px] space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password });
          setBusy(false);
          if (error) setError(error.message);
          else doneRecovering();
        }}
      >
        <Logo />
        <h1 className="pt-6 font-serif text-[2.25rem] leading-tight">Choose a new password.</h1>
        <Field label="New password" hint="At least 8 characters.">
          <input className={inputCls} type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <p role="alert" className="rounded-xl bg-ember-soft px-4 py-3 text-ember">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">Save password</Button>
      </form>
    </div>
  );
}
