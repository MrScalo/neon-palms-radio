import type { Metadata } from "next";
import {
  ContactEmail,
  LegalPage,
  OperatorAddress,
  PlaceholderWarning,
} from "@/components/legal/LegalPage";
import { FAN_PROJECT_DISCLAIMER, site } from "@/config/site";

export const metadata: Metadata = {
  title: `Legal notice · ${site.name}`,
  robots: { index: false, follow: true },
  description: `Legal notice (Impressum) of ${site.name}, an unofficial, non-commercial fan project.`,
};

export default function ImprintPage() {
  return (
    <LegalPage eyebrow="Legal" title="Legal notice (Impressum)">
      <PlaceholderWarning />

      {/* § 18 (1) MStV because the site is private and non-commercial. If it ever becomes a
          commercial service, § 5 DDG applies instead and needs a second direct contact channel
          (e.g. a phone number) besides email. */}
      <h2>Information according to § 18 (1) MStV</h2>
      <OperatorAddress />

      <h2>Contact</h2>
      <p>
        Email: <ContactEmail />
      </p>

      <h2>Responsible for content according to § 18 (2) MStV</h2>
      <OperatorAddress />

      <h2>Fan project and rights</h2>
      <p>{FAN_PROJECT_DISCLAIMER}</p>
      <p>
        Music videos are embedded from the official YouTube channels of the respective artists
        and labels using YouTube’s embedded player. All rights to the music, videos, artist names
        and song titles remain with their owners. If you are a rights holder and would like a
        video removed from rotation, please email <ContactEmail /> and we will take care of
        it promptly.
      </p>

      <h2>Terms of use</h2>
      <p>
        The music player on {site.name} uses YouTube API Services. By using the player you agree
        to be bound by the{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        .
      </p>

      <h2>Liability for links</h2>
      <p>
        This website contains links to external websites, such as YouTube. We have no influence
        on their content, so we cannot accept any liability for it. The respective provider or
        operator is always responsible for the content of linked pages. We checked the linked
        pages for possible legal violations at the time of linking and found none. If we become
        aware of any legal violation, we will remove the link immediately.
      </p>
    </LegalPage>
  );
}
