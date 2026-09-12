"use client";

import { useState, type FormEvent } from "react";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { authRequest, readSession } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [pending, setPending] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [useOtp, setUseOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone") || "").trim();
    setPending(true);
    setMessage("");
    try {
      if (useOtp && !otpPhone) {
        const result = await authRequest("otp/request", { phone });
        setOtpPhone(phone);
        setMessage(result.message || "If an account exists for this phone number, a verification code has been sent.");
      } else {
        const result = useOtp
          ? await authRequest("otp/verify", { phone: otpPhone, otp: String(data.get("otp") || "").trim() })
          : await authRequest("password", { phone, password: String(data.get("password") || "") });
        setSession(readSession(result));
        router.replace("/dashboard");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} method="post" aria-busy={pending}>
      <fieldset className="login-fields" disabled={pending}>
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          readOnly={!!otpPhone}
          autoComplete="tel"
          placeholder="Enter your phone number"
          required
        />
      </div>
      {useOtp && otpPhone && <div className="field">
        <label htmlFor="otp">Verification code</label>
        <input id="otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{4,10}" minLength={4} maxLength={10} placeholder="Enter your OTP" required autoFocus />
        <button className="text-button" type="button" onClick={() => { setOtpPhone(""); setMessage(""); }}>Change phone or request a new code</button>
      </div>}
      {!useOtp && <div className="field">
        <label htmlFor="password">Password</label>
        <div className="password-input">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {showPassword && <path d="m3 3 18 18" />}
            </svg>
          </button>
        </div>
      </div>}
      {!useOtp && <div className="form-options">
        <button
          className="text-button"
          type="button"
          onClick={() =>
            setMessage(
              "Please ask your group administrator to help you reset your password.",
            )
          }
        >
          Forgot password?
        </button>
      </div>}
      <button className="submit-button" type="submit">
        {pending ? "Please wait…" : useOtp ? otpPhone ? "Verify OTP" : "Send OTP" : "Sign in"} <span aria-hidden="true">↗</span>
      </button>
      <div className="login-method">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setUseOtp(!useOtp);
            setOtpPhone("");
            setShowPassword(false);
            setMessage("");
          }}
        >
          {useOtp ? "Login using password" : "Login using OTP"}
        </button>
      </div>
      </fieldset>
      <p className="form-message" role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}

export function RetryGroupValidation() {
  return (
    <button className="submit-button" type="button" onClick={() => window.location.reload()}>
      Try again
    </button>
  );
}
