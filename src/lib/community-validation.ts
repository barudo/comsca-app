import { cache } from "react";
import { validateGroupSlug } from "@/lib/group-validation";

// Share one validation result between the layout and page within each request.
export const getCommunityValidation = cache(validateGroupSlug);
