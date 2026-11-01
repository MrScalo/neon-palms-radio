/**
 * Station identity plus the legal details shown in the legal notice and the privacy policy.
 *
 * Running your own copy? Replace the operator and hosting details with your own. A value in
 * square brackets counts as a placeholder: while any remains, `isOperatorConfigured` is false
 * and the legal pages show a "Draft" warning.
 */
export const site = {
  name: "Neon Palms FM",
  frequency: "88.6 FM",
  tagline: "Neon nights. Endless summer.",
  location: "the Sunset Coast",
  operator: {
    name: "Nico Peitz",
    street: "Mettlerkampsweg 28",
    postalCity: "20535 Hamburg",
    country: "Germany",
    email: "nico.peitz22@gmail.com",
  },
  hosting: {
    provider: "Vercel Inc.",
    address: "440 N Barranca Avenue #4133, Covina, CA 91723, USA",
    privacyPolicyUrl: "https://vercel.com/legal/privacy-policy",
    // Art. 13(2)(a) GDPR: how long the server logs we can access are kept (Vercel Hobby plan:
    // runtime logs for one hour). The US transfer basis is stated in the privacy policy itself.
    logRetention: "one hour",
  },
} as const;

export function isPlaceholder(value: string): boolean {
  return /^\[.*\]$/.test(value.trim());
}

export const isOperatorConfigured: boolean = [
  ...Object.values(site.operator),
  ...Object.values(site.hosting),
].every((value) => !isPlaceholder(value));
