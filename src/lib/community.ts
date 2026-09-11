/** Hostname is display context only, never proof of membership or authorization. */
export function getCommunity(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const match = hostname.match(
    /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)\.(?:comsca\.com|localhost)$/,
  );
  if (!match || match[1] === "www") return null;
  return match[1];
}
