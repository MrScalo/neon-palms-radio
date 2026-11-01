/**
 * Station identity plus the legal details shown in the legal notice and the privacy policy.
 *
 * IMPORTANT: every value in square brackets is a placeholder. They MUST be replaced with the
 * real operator and hosting details before this site is published — a legal notice and a
 * privacy policy with placeholders are not valid. While any placeholder remains,
 * `isOperatorConfigured` is false and the legal pages show a warning.
 */
export const site = {
  name: "Neon Palms FM",
  frequency: "88.6 FM",
  tagline: "Neon nights. Endless summer.",
  location: "the Sunset Coast",
  operator: {
    name: "[Operator name]",
    street: "[Street and house number]",
    postalCity: "[Postal code and city]",
    country: "[Country]",
    email: "[Contact email address]",
  },
  hosting: {
    provider: "[Hosting provider name]",
    address: "[Hosting provider address]",
    // Art. 13(2)(a) GDPR requires stating how long server logs are kept. If the provider stores
    // data outside the EU/EEA, the privacy policy must also name the legal basis for that transfer.
    logRetention: "[Log retention period, e.g. 14 days]",
  },
} as const;

export function isPlaceholder(value: string): boolean {
  return /^\[.*\]$/.test(value.trim());
}

export const isOperatorConfigured: boolean = [
  ...Object.values(site.operator),
  ...Object.values(site.hosting),
].every((value) => !isPlaceholder(value));
