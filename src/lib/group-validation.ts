export type GroupStatus = "registered" | "unregistered" | "error";

export type Group = { id: number; name: string };
export type GroupValidation = { status: GroupStatus; group: Group | null };

export async function validateGroupSlug(slug: string): Promise<GroupValidation> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1"
  ).replace(/\/+$/, "");

  try {
    const response = await fetch(
      `${baseUrl}/groups/validate-slug?${new URLSearchParams({ slug })}`,
      { headers: { "x-group-slug": slug }, cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return { status: "error", group: null };
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("success" in body)) {
      return { status: "error", group: null };
    }
    // This endpoint reports availability: false means the group already exists.
    if (body.success === false) {
      const group = "group" in body ? body.group : null;
      const validGroup = group && typeof group === "object" &&
        "id" in group && typeof group.id === "number" &&
        "name" in group && typeof group.name === "string" && group.name.trim()
        ? { id: group.id, name: group.name.trim() } : null;
      return { status: "registered", group: validGroup };
    }
    if (body.success === true) return { status: "unregistered", group: null };
    return { status: "error", group: null };
  } catch {
    return { status: "error", group: null };
  }
}
