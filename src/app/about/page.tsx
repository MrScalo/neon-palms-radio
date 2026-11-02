import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { JsonLd } from "@/components/seo/JsonLd";
import { DEFAULT_STATION_ID, STATIONS } from "@/config/stations";
import { stationPath } from "@/components/radio/stationUrl";
import { faqEntries } from "@/lib/seo/facts";
import { pageMetadata } from "@/lib/seo/metadata";
import { faqGraph } from "@/lib/seo/structuredData";

const PAGE = {
  path: "/about",
  title: "About Neon Palms Radio — GTA 6 Fan Radio FAQ",
  description:
    "What Neon Palms Radio is, which songs are in the GTA 6 trailers, when GTA VI comes out, what Leonida is and how the three live stations stay in sync.",
};

export const metadata: Metadata = pageMetadata(PAGE, PAGE.path);

export default function AboutPage() {
  const entries = faqEntries();
  return (
    <LegalPage
      eyebrow="About · FAQ"
      title="About Neon Palms Radio"
      lead={
        <p>
          A free, unofficial fan radio for the road to Leonida: three stations with the songs from
          the GTA VI trailers, 80s hits from the GTA radio dial and pure 80s, live around the clock.
        </p>
      }
    >
      <JsonLd data={faqGraph(PAGE, entries)} />
      {entries.map((entry) => (
        <FaqItem key={entry.question} {...entry} />
      ))}
      <h2>Tune in</h2>
      <ul>
        {STATIONS.map((station) => (
          <li key={station.id}>
            <Link href={stationPath(station, DEFAULT_STATION_ID)}>
              {station.name} {station.frequency}
            </Link>{" "}
            — {station.tagline}
          </li>
        ))}
        <li>
          <Link href="/rotation">The Rotation</Link> — every song on every station
        </li>
      </ul>
    </LegalPage>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <>
      <h2>{question}</h2>
      <p>{answer}</p>
    </>
  );
}
