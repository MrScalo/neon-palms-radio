import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactEmail,
  LegalPage,
  OperatorAddress,
  PlaceholderWarning,
} from "@/components/legal/LegalPage";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `Privacy Policy · ${site.name}`,
  description: `How ${site.name} handles your data: no analytics, ads or tracking of our own, and YouTube only after you say yes.`,
};

const SECTIONS = [
  { id: "controller", title: "Who is responsible" },
  { id: "hosting", title: "Hosting and server log files" },
  { id: "station-clock", title: "The station clock" },
  { id: "listener-count", title: "The listener count" },
  { id: "station-address", title: "The station in the page address" },
  { id: "consent-storage", title: "Remembering your choice" },
  { id: "youtube", title: "The YouTube player" },
  { id: "youtube-links", title: "Links to YouTube" },
  { id: "fonts", title: "Fonts" },
  { id: "rights", title: "Your rights" },
] as const;

// Database of the listener count. The address is the one Upstash registered on the Data Privacy
// Framework list; the region is the one chosen when the database was created (see README).
const COUNTER_STORE = {
  provider: "Upstash, Inc.",
  address: "6202 Vía De Adrianna, San Jose, CA 95120, USA",
  privacyPolicyUrl: "https://upstash.com/trust/privacy",
} as const;

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy Policy"
      lead={
        <p>
          The short version: {site.name} runs no analytics, ads or tracking of its own, and our
          site sets no cookies. The YouTube player — and with it any connection to Google,
          including any ads YouTube shows in the player — only loads after you click{" "}
          <strong className="text-cream">“Accept &amp; tune in”</strong>.
        </p>
      }
    >
      <PlaceholderWarning />

      <nav aria-label="On this page" className="my-8 rounded-xl border border-plum bg-dusk/60 px-5 py-4">
        <p className="font-display text-xs tracking-[0.2em] text-muted uppercase">On this page</p>
        <ul className="mt-3 space-y-1 text-sm">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 id="controller">Who is responsible</h2>
      <p>
        The controller responsible for processing personal data on this website within the
        meaning of the General Data Protection Regulation (GDPR) is:
      </p>
      <OperatorAddress />
      <p>
        Email: <ContactEmail />
      </p>
      <p>
        {site.name} is a private, non-commercial fan project. You can use the whole site without
        creating an account or giving us any information. Without your consent you can use
        everything except the music player itself.
      </p>

      <h2 id="hosting">Hosting and server log files</h2>
      <p>
        This website is hosted by <strong>{site.hosting.provider}</strong>,{" "}
        {site.hosting.address}. Whenever your browser requests a page or file from us, the
        server automatically records technical information in so-called log files:
      </p>
      <ul>
        <li>your IP address,</li>
        <li>the date and time of the request,</li>
        <li>the requested address (URL),</li>
        <li>your browser and operating system (user agent),</li>
        <li>the page you came from (referrer), if your browser sends it.</li>
      </ul>
      <p>
        We need this data to deliver the website to you, to keep it secure and stable, and to
        detect and fix errors and misuse. The legal basis is Art. 6(1)(f) GDPR — our legitimate
        interest in a secure, working website. The recipient of this data is our hosting
        provider, which runs the servers for us on our behalf under a data processing agreement
        (Art. 28 GDPR). The log entries we can access are kept for {site.hosting.logRetention}{" "}
        and then deleted; {site.hosting.provider} itself keeps such technical data only as long as
        it needs it to run and secure its service. We do not combine this data with other data and
        do not use it to identify you.
      </p>
      <p>
        For the same purpose, {site.hosting.provider}&apos;s firewall briefly uses your IP address to
        fend off attacks and to limit how often a single connection can report to the listener
        count (rate limiting). Nothing is stored for this beyond short-lived counters at the
        firewall.
      </p>
      <p>
        Our server functions (such as the station clock and the listener count below) run in
        Vercel’s Frankfurt region in Germany. Pages and files are delivered through Vercel’s global
        network from the location nearest to you. Because {site.hosting.provider} is based in the USA, personal data may be
        transferred there. Vercel is certified under the EU-U.S. Data Privacy Framework, for which
        the European Commission adopted an adequacy decision on 10 July 2023 (Art. 45 GDPR); in
        addition, the data processing agreement includes the EU Standard Contractual Clauses
        (Art. 46(2)(c) GDPR). Details:{" "}
        <a href={site.hosting.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
          Vercel’s privacy policy
        </a>
        .
      </p>

      <h2 id="station-clock">The station clock</h2>
      <p>
        {site.name} works like real radio: everyone tuned to the same station hears the same
        song at the same moment. To make that possible, your browser asks our own server for the
        current time (the <code>/api/time</code> endpoint) when you open the radio and may repeat
        this to keep the clock in sync. The answer contains nothing but the server time and a
        short version tag of the stations’ playlists, so a page opened before a playlist update
        knows it is out of date.
      </p>
      <p>
        These requests only synchronise playback. Nothing is stored about them beyond the normal
        server log entries described above, and no third party is involved. The “now playing”
        information you see for each station is calculated from our own schedule, so it works
        without YouTube.
      </p>
      <p>
        If the playlists change while the radio is open, the page may reload itself to pick up
        the new programme. So that this happens only once, it notes the new version tag in your
        browser’s session storage. The entry contains no personal data, is not sent to us and is
        deleted when you close the tab. Storing it is strictly necessary for the radio to work
        (§ 25(2) no. 2 TDDDG).
      </p>

      <h2 id="listener-count">The listener count</h2>
      <p>
        The radio shows how many people are tuned in right now, in total and for each station. To
        count listeners without recognising anyone, the radio sends our own server a short request
        (to the <code>/api/presence</code> endpoint) about every 30 seconds while it is open in a
        browser tab you can see. The request contains nothing but the id of the station you have
        selected, for example <code>{`{"station":"rearview"}`}</code>. It carries no identifier and
        no cookie, nothing is read from your browser’s storage for it, and nothing is stored there.
        A hidden tab sends no requests and drops out of the count within a minute.
      </p>
      <p>
        For each request, our server adds 1 to a counter for that station and the current 30-second
        window, and answers with the counts of the previous window — the numbers you see on the
        page. A counter is only a number per station and time window: it does not record who was
        counted and cannot tell one listener’s requests from another’s. Each counter is deleted
        automatically two minutes after it was last increased.
      </p>
      <p>
        The counters are stored in a database that <strong>{COUNTER_STORE.provider}</strong>,{" "}
        {COUNTER_STORE.address}, runs for us in its Frankfurt region (AWS eu-central-1) in Germany,
        as our processor under its data processing addendum (Art. 28 GDPR). Only our server
        connects to this database. Your browser never contacts Upstash, so Upstash does not receive
        your IP address or any other information about you.
      </p>
      <p>
        The only personal data involved is what every request to our website carries — such as
        your IP address and browser — which our hosting provider records in its log files as
        described under <a href="#hosting">Hosting and server log files</a>. The legal basis is
        Art. 6(1)(f) GDPR; our legitimate interest is to show a live listener count, so that the
        radio feels like the shared broadcast it is.
      </p>
      <p>
        We do not ask for your consent under § 25 TDDDG for the listener count: nothing is stored
        on your device for it, and no information already stored there, such as cookies or browser
        storage, is read. The request only contains the station you picked on the page and reaches
        our server like any other request the page makes. Even if sending it were regarded as
        access to your device, it would be strictly necessary to provide the listener count, which
        is part of the radio you opened (§ 25(2) no. 2 TDDDG).
      </p>
      <p>
        The counters stay in Upstash’s Frankfurt region. {COUNTER_STORE.provider} itself is based
        in the USA. It is certified under the EU-U.S. Data Privacy Framework, for which the European
        Commission adopted an adequacy decision on 10 July 2023 (Art. 45 GDPR); in addition, its data
        processing addendum includes the EU Standard Contractual Clauses (Art. 46(2)(c) GDPR).
        Details:{" "}
        <a href={COUNTER_STORE.privacyPolicyUrl} target="_blank" rel="noopener noreferrer">
          Upstash’s privacy policy
        </a>
        .
      </p>

      <h2 id="station-address">The station in the page address</h2>
      <p>
        When you switch stations, the page address shows the one you picked — for example{" "}
        <code>/?station=rearview</code> — so you can bookmark it or share a link that opens the
        same station. That is its only purpose. We do not save your choice — nothing is stored in
        your browser for it, and nothing on our server beyond the normal log entries.
      </p>
      <p>
        Like any page address, it can appear in the server log entries described above — as the
        requested address when you open such a link, or as the referrer of requests the page
        makes afterwards, such as to the station clock or for the listener count. If you have
        allowed the YouTube player, the page address Google receives (see below) can include the
        station as well.
      </p>

      <h2 id="consent-storage">Remembering your choice</h2>
      <p>
        When you decide about the YouTube player, we save that decision in your browser’s local
        storage under the key <code>neonpalms.consent.v1</code>. It contains only your decision
        (allowed or not allowed) and the time you made it. It stays on your device and is not
        sent to us. It is not a cookie, and apart from the version tag described under{" "}
        <a href="#station-clock">the station clock</a> we do not store anything else in your
        browser.
      </p>
      <p>
        Saving it is strictly necessary to respect your choice — otherwise we would have to ask
        you again on every visit, or could not stop YouTube from loading once you said no. The
        legal basis is § 25(2) no. 2 of the German Telecommunications Digital Services Data
        Protection Act (TDDDG) for storing it on your device and Art. 6(1)(f) GDPR for
        processing it — our legitimate interest in respecting your choice.
      </p>
      <p>
        The entry is deleted when you withdraw your decision via{" "}
        <strong>“Privacy settings”</strong> at the bottom of every page, or when you clear the
        site data in your browser.
      </p>

      <h2 id="youtube">The YouTube player</h2>
      <p>
        The music on {site.name} plays through YouTube’s embedded video player, using only the
        official videos published by the artists and their labels. The player is provided by
        Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (“Google”).
      </p>
      <p>
        This website uses YouTube API Services (the YouTube IFrame Player API). By using the
        player you agree to the{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">
          YouTube Terms of Service
        </a>
        .
      </p>

      <h3>Only after you agree</h3>
      <p>
        Until you click <strong>“Accept &amp; tune in”</strong>, this website makes no
        connection to YouTube or any other Google service — no player, no scripts, no preview
        images. Once you agree, your browser loads YouTube’s IFrame Player API script from{" "}
        <code>www.youtube.com</code> (which loads a further script from{" "}
        <code>www.youtube.com</code>) and the player itself from YouTube’s privacy-enhanced mode
        at <code>youtube-nocookie.com</code>.
      </p>
      <p>
        Privacy-enhanced mode applies to the player only, and it reduces but does not prevent the
        data YouTube collects. The script requests to <code>www.youtube.com</code> can set and
        read YouTube cookies if your browser allows third-party cookies — for example{" "}
        <code>VISITOR_INFO1_LIVE</code>, <code>VISITOR_PRIVACY_METADATA</code> and{" "}
        <code>__Secure-YNID</code> (kept for about six months) and <code>YSC</code> (until you
        close the browser) — and they carry the YouTube and Google cookies already in your
        browser, including sign-in cookies if you are logged in.
      </p>

      <h3>What happens when the player loads</h3>
      <ul>
        <li>Your browser connects directly to Google’s servers.</li>
        <li>
          Google receives your IP address, information about your device and browser (for
          example browser type, operating system, language and screen size), the address of this
          page, and information about the playback.
        </li>
        <li>
          YouTube may store cookies or similar data (such as local storage) in your browser —
          even in privacy-enhanced mode.
        </li>
        <li>
          If you are logged in to a Google account, YouTube may link this data to your account.
          If you don’t want that, log out of your Google account before tuning in.
        </li>
        <li>
          YouTube may show advertisements and other content in the player; these are served by
          YouTube/Google, not by us.
        </li>
      </ul>
      <p>
        We have no influence on how Google processes this data. The legal basis is your consent
        under Art. 6(1)(a) GDPR and § 25(1) TDDDG.
      </p>

      <h3>Transfer to the USA</h3>
      <p>
        Google may transfer data to Google LLC in the USA. Google LLC is certified under the
        EU-U.S. Data Privacy Framework, for which the European Commission adopted an adequacy
        decision on 10 July 2023. You can find more information in Google’s privacy policy:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          https://policies.google.com/privacy
        </a>
        .
      </p>

      <h3>Withdrawing your consent</h3>
      <p>
        You can withdraw your consent at any time via <strong>“Privacy settings”</strong> at the
        bottom of every page. The player is switched off immediately and YouTube won’t be loaded
        again unless you agree again. Withdrawal is effective for the future; it does not affect
        the lawfulness of processing before the withdrawal (Art. 7(3) GDPR).
      </p>
      <p>
        Withdrawing does not delete cookies or other data YouTube has already stored in your
        browser for <code>youtube.com</code> and <code>youtube-nocookie.com</code> (some are kept
        for about six months). You can delete them in your browser settings.
      </p>

      <h2 id="youtube-links">Links to YouTube</h2>
      <p>
        The <Link href="/rotation">Rotation</Link> page lists every song on every station with a
        plain “Watch on YouTube” link. Nothing is loaded from YouTube on that page. Only if you click a link
        does your browser open YouTube’s website — from then on, Google’s privacy policy
        applies.
      </p>

      <h2 id="fonts">Fonts</h2>
      <p>
        All fonts on this website are served from our own server. Your browser does not connect
        to Google Fonts or any other font service.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>Regarding your personal data, you have the right to:</p>
      <ul>
        <li>access the data we process about you (Art. 15 GDPR),</li>
        <li>have incorrect data corrected (Art. 16 GDPR),</li>
        <li>have your data erased (Art. 17 GDPR),</li>
        <li>restrict processing (Art. 18 GDPR),</li>
        <li>receive your data in a portable format (Art. 20 GDPR),</li>
        <li>withdraw any consent you gave, with effect for the future (Art. 7(3) GDPR).</li>
      </ul>
      <p>
        To exercise your rights, simply send an email to <ContactEmail />. Because we don’t run
        accounts or tracking, we usually cannot link log entries to a specific person without
        further information from you.
      </p>
      <p>
        You also have the right to lodge a complaint with a data protection supervisory
        authority (Art. 77 GDPR), in particular in the EU member state where you live, where you
        work, or where you believe the infringement took place.
      </p>

      <h3>Right to object</h3>
      <p>
        <strong>
          Where we process data on the basis of Art. 6(1)(f) GDPR (server log files, the listener
          count, your stored choice), you can object at any time on grounds relating to your
          particular situation (Art. 21 GDPR).
        </strong>{" "}
        Just email <ContactEmail />.
      </p>

      <div className="mt-12 text-sm text-muted">Last updated: November 1, 2026</div>
    </LegalPage>
  );
}
