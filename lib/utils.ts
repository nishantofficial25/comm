// lib/utils.ts

const CM_TO_PX = 300 / 2.54;

export const cmToPx = (value: string | number): number | null => {
  if (typeof value === "string" && value.includes("cm"))
    return Math.round(parseFloat(value) * CM_TO_PX);
  return Number(value) || null;
};

export const splitText = (t: string): string =>
  t.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

export const revokeUrl = (url: string | null | undefined): void => {
  if (url) URL.revokeObjectURL(url);
};

export const isSignatureType = (type = ""): boolean => /sign/i.test(type);

export const parseSize = (val: string | null | undefined): number | null => {
  if (!val) return null;
  if (val.includes("cm")) return cmToPx(val);
  return Number(val.replace("px", "")) || null;
};

/**
 * Returns true if the value (condition name or additionalRequirements string)
 * signals a fingerprint / thumb-impression job.
 * Triggers on: "fingerprint", "thumb", "impression" (case-insensitive).
 */
export const isFingerprintRequirement = (value?: string | null): boolean => {
  if (!value) return false;
  const s = value.trim().toLowerCase();
  return (
    s.includes("fingerprint") || s.includes("thumb") || s.includes("impression")
  );
};

/**
 * Returns true if additionalRequirements is a non-empty, non-"nil" string
 * AND does not match a fingerprint requirement.
 * When true, the face-detection pipeline runs first (75% face coverage),
 * then the result is resized to the card's target dimensions and compressed.
 */
export const isFaceRequirement = (
  additionalRequirements?: string | null,
): boolean => {
  if (!additionalRequirements) return false;
  const s = additionalRequirements.trim().toLowerCase();
  if (s === "" || s === "nil") return false;
  // Fingerprint conditions must not trigger the face pipeline
  if (isFingerprintRequirement(s)) return false;
  return true;
};
