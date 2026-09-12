export type GroupStatus = "registered" | "unregistered" | "error";

export async function validateGroupSlug(slug: string): Promise<GroupStatus> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(
      `${baseUrl}/groups/validate-slug?${new URLSearchParams({ slug })}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return "error";
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("success" in body)) {
      return "error";
    }
    // This endpoint reports availability: false means the group already exists.
    if (body.success === false) return "registered";
    if (body.success === true) return "unregistered";
    return "error";
  } catch {
    return "error";
  }
}
