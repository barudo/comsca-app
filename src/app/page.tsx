import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { CommunityIntroduction } from "@/components/community-introduction";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="COMSCA home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
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
              <h2 id="login-title">Welcome back.</h2>
              <CommunityIntroduction />
            </div>
            <LoginForm />
            <div className="join-note">
              New to COMSCA?
              <br />
              <span>Ask your group administrator for an account.</span>
            </div>
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
