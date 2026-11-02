import type { Station } from "@/lib/radio/types";

type StationRef = Pick<Station, "id" | "slug">;

/** Older links named the station as ?station=<id>; they still work and are rewritten to the station's page. */
export const STATION_PARAM = "station";

/** The station's own page: / for the default station, /<slug> for the others. */
export function stationPath(station: StationRef, defaultId: string): string {
  return station.id === defaultId ? "/" : `/${station.slug}`;
}

/** The station an old ?station= link asks for, if it names one of `stations`. */
export function stationIdFromSearch(search: string, stations: readonly StationRef[]): string | null {
  const id = new URLSearchParams(search).get(STATION_PARAM);
  return id !== null && stations.some((station) => station.id === id) ? id : null;
}

/** The station whose own page `pathname` is; null for / and any other page. */
export function stationIdFromPath(pathname: string, stations: readonly StationRef[], defaultId: string): string | null {
  const station = stations.find((item) => item.id !== defaultId && `/${item.slug}` === pathname);
  return station?.id ?? null;
}

/** `href` moved to `path`, as a same-origin URL for history.replaceState: an old ?station= goes, other parameters and the hash stay. */
export function withStationPath(href: string, path: string): string {
  const url = new URL(href);
  url.searchParams.delete(STATION_PARAM);
  return `${path}${url.search}${url.hash}`;
}

/** What the radio does to line the selected station up with the page address. */
export type AddressSync = { select?: string; writePath?: string } | null;

/**
 * Run whenever the radio appears (first load, and every time a kept page is shown again):
 * - an old ?station= link wins, and the address becomes that station's page;
 * - a station page (/rearview, Back/Forward) wins;
 * - a bare / gets the kept station's page written back, unless that is the default station / already means.
 */
export function reconcileAddress(
  location: { pathname: string; search: string },
  stations: readonly StationRef[],
  selectedId: string,
  defaultId: string,
): AddressSync {
  const fromLink = stationIdFromSearch(location.search, stations);
  if (fromLink !== null) {
    const station = stations.find((item) => item.id === fromLink)!;
    return { ...(fromLink === selectedId ? {} : { select: fromLink }), writePath: stationPath(station, defaultId) };
  }
  const fromPath = stationIdFromPath(location.pathname, stations, defaultId);
  if (fromPath !== null) return fromPath === selectedId ? null : { select: fromPath };
  if (location.pathname !== "/" || selectedId === defaultId) return null;
  const kept = stations.find((item) => item.id === selectedId);
  return kept === undefined ? null : { writePath: stationPath(kept, defaultId) };
}
