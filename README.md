# COMSCA

Next.js App Router application with TypeScript, a responsive white-and-blue landing page, and a login form.

## Development

Use Node.js 22.18+ (or Node.js 24 LTS).

```sh
npm ci
npm run dev
```

Visit http://localhost:3000. To preview a community, visit http://cebu.localhost:3000 in a browser that resolves localhost subdomains, or send a request with `Host: cebu.comsca.com`.

```sh
npm run lint
npm test
npm run build
npm start
```

## Domains

The server-rendered landing page reads the request Host header and recognizes a single community subdomain such as `cebu.comsca.com`. The root domain and `www` show the general landing page. All community subdomains share the same App Router page; its login introduction includes the community name. See `src/lib/community.ts`.

To serve public domains, deploy the app, add `comsca.com` and `*.comsca.com` to your hosting project, configure the DNS records specified by your host, and provision HTTPS for both the root and wildcard domain. On a self-hosted reverse proxy, forward the original Host header to Next.js. DNS and TLS must be configured outside this repository; they are not provisioned by the app.

Subdomain detection is display context only. Before adding community data, validate communities against a database and enforce membership on every protected request. Never use a hostname alone as authorization.

## Authentication

The login interface has required email/password validation, a password visibility toggle, and accessible status feedback. Authentication is not configured: submission shows an explanatory message and does not transmit or store credentials. Password recovery directs members to their administrator. Connect a real authentication provider in `src/components/login-form.tsx` and implement server-side session and community authorization before enabling account access.

## Content

The COMSCA introduction is based on the [CoMSCA Network definition](https://comsca.worldvision.org.ph/about/). App Router request headers follow the [Next.js documentation](https://nextjs.org/docs/app/api-reference/functions/headers).
