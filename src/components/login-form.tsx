"use client";

import { useState, type FormEvent } from "react";

export function LoginForm() {
  const [useOtp, setUseOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Connect your authentication provider here. Never simulate a successful login.
    setMessage(
      useOtp
        ? "OTP sign-in is not available yet. Please contact your group administrator while account access is being set up."
        : "Sign-in is not available yet. Please contact your group administrator while account access is being set up.",
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} method="post">
      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="Enter your phone number"
          required
        />
      </div>
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
        {useOtp ? "Send OTP" : "Sign in"} <span aria-hidden="true">↗</span>
      </button>
      <div className="login-method">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setUseOtp(!useOtp);
            setShowPassword(false);
            setMessage("");
          }}
        >
          {useOtp ? "Login using password" : "Login using OTP"}
        </button>
      </div>
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
