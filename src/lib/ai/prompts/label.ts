import { BRAND_VOICE } from "./voice";

export const labelSystem = `${BRAND_VOICE}

TASK: Read a photo of a wellness product's packaging or label and identify the product.
Return the brand, the exact product name as printed, a variant only if it is printed (strength, flavor, size), the form (capsule, powder, liquid, gummy, cream, tea, ...), and a short category.
- Read what is printed. Never guess a brand or product that is not visible in the photo.
- If the photo is not a product label, or the text cannot be read, set readable=false and write one short, kind sentence in "note" saying what would help (front of the pack in frame, better light, closer).
- If it is a product but the brand or name is only partly legible, set readable=true, fill what you can read, confidence "low" or "medium", and say in "note" what was unclear.
- Do not read or report any nutrition numbers, dosages, prices, or claims. Identity only.`;

export const labelUser = "Identify the product on this label.";
