import Link from "next/link";
import { headers } from "next/headers";
import { getCommunity } from "@/lib/community";
import { validateGroupSlug } from "@/lib/group-validation";
import { LoginForm, RetryGroupValidation } from "@/components/login-form";
import { CommunityIntroduction } from "@/components/community-introduction";

export default async function Home() {
  const slug = getCommunity((await headers()).get("host"));
  const groupStatus = slug ? await validateGroupSlug(slug) : "registered";
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="COMSCA home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 20h10" />
              <path d="M10 20c5.5-2.5.8-6.4 3-10" />
              <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
              <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
            </svg>
          </span>
          comsca<span className="brand-dot">.</span>
        </Link>
        <span className="header-caption">
          Small savings. Shared possibilities.
        </span>
      </header>
      <main className="landing">
        <section className="introduction" aria-labelledby="intro-title">
          <span className="eyebrow">
            <span className="small-dot" /> BUILT AROUND COMMUNITY
          </span>
          <h1 id="intro-title">
            Together, we
            <br />
            save for <span>more.</span>
          </h1>
          <div className="definition">
            <h2>
              Community Managed Savings
              <br className="desktop-break" /> and Credit Association
            </h2>
            <p>
              COMSCA brings people together to save regularly, borrow from a
              shared fund, and support one another. It’s a community-led way to
              build financial resilience, one small contribution at a time.
            </p>
          </div>
          <div className="principles">
            <div>
              <span className="principle-number">01</span>
              <h3>Save together</h3>
              <p>
                Small steps toward
                <br />
                something bigger.
              </p>
            </div>
            <div>
              <span className="principle-number">02</span>
              <h3>Grow together</h3>
              <p>
                Access credit for
                <br />
                what matters.
              </p>
            </div>
            <div>
              <span className="principle-number">03</span>
              <h3>Thrive together</h3>
              <p>
                A community you
                <br />
                can count on.
              </p>
            </div>
          </div>
          <div className="community-note">
            <span className="people" aria-hidden="true">
              <span>↗</span>
              <span>↗</span>
              <span>↗</span>
            </span>
            <p>
              Powered by people.
              <br />
              <strong>Rooted in trust.</strong>
            </p>
          </div>
        </section>
        <section className="login-section" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-symbol" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                <rect x="5" y="10" width="14" height="11" rx="3" />
                <path d="M12 14v3" />
              </svg>
            </div>
            <div className="login-heading">
              <span className="eyebrow">YOUR COMMUNITY STARTS HERE</span>
              <h2 id="login-title">
                {groupStatus === "unregistered" ? "Group not found." : groupStatus === "error" ? "Unable to verify group." : "Welcome back."}
              </h2>
              {groupStatus === "registered" && <CommunityIntroduction />}
              {groupStatus === "unregistered" && (
                <p>This group doesn’t exist. Want to make <strong>{slug}</strong> your group? Register it to get started.</p>
              )}
              {groupStatus === "error" && (
                <p>We couldn’t check your group right now. Please try again.</p>
              )}
            </div>
            {groupStatus === "unregistered" && (
              <a className="submit-button" href="https://comsca.com/register">Register Here <span aria-hidden="true">↗</span></a>
            )}
            {groupStatus === "error" && (
              <RetryGroupValidation />
            )}
            {groupStatus === "registered" && <LoginForm />}
            {groupStatus === "registered" && <div className="join-note">
              New to COMSCA?
              <br />
              <span>Ask your group administrator for an account.</span>
            </div>}
          </div>
          <p className="below-card">
            <span aria-hidden="true">◇</span> A little saved today. A stronger
            tomorrow.
          </p>
        </section>
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} COMSCA. Growing together.</span>
        <span>Community first. Always.</span>
      </footer>
    </div>
  );
}
