/**
 * Network identity plus the legal details shown in the legal notice and the privacy policy.
 * The stations themselves (names, frequencies, tracks) live in src/config/stations.ts.
 *
 * Running your own copy? Replace the operator and hosting details with your own. A value in
 * square brackets counts as a placeholder: while any remains, `isOperatorConfigured` is false
 * and the legal pages show a "Draft" warning.
 */
export const site = {
  name: "Neon Palms Radio",
  /** The neon script part of the logo; the logo adds "Radio" next to it. */
  wordmark: "Neon Palms",
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

/** Shown in the footer and the legal notice. */
export const FAN_PROJECT_DISCLAIMER = `${site.name} is an unofficial, non-commercial fan project. It is not affiliated with, endorsed or sponsored by any video game publisher or developer, by YouTube or Google, or by any of the artists or record labels whose music it plays.`;

export function isPlaceholder(value: string): boolean {
  return /^\[.*\]$/.test(value.trim());
}

export const isOperatorConfigured: boolean = [
  ...Object.values(site.operator),
  ...Object.values(site.hosting),
].every((value) => !isPlaceholder(value));
