import type { Station } from "@/lib/radio/types";

/** ?station=<id> makes a link open on that station. */
export const STATION_PARAM = "station";

/** The station a link asks for, if it names one of `stations`. */
export function stationIdFromSearch(search: string, stations: readonly Pick<Station, "id">[]): string | null {
  const id = new URLSearchParams(search).get(STATION_PARAM);
  return id !== null && stations.some((station) => station.id === id) ? id : null;
}

/** `href` pointing at station `id`, as a same-origin path for history.replaceState; other parameters and the hash stay. */
export function withStationParam(href: string, id: string): string {
  const url = new URL(href);
  url.searchParams.set(STATION_PARAM, id);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** What the radio does to line the selected station up with the page address. */
export type AddressSync = { select: string } | { writeParam: string } | null;

/**
 * Run whenever the radio appears (first load, and every time a kept page is shown again): an
 * address that names a station wins (a shared link, Back/Forward); a bare address gets the kept
 * station written back, unless that is the default station a bare address already means.
 */
export function reconcileAddress(
  search: string,
  stations: readonly Pick<Station, "id">[],
  selectedId: string,
  defaultId: string,
): AddressSync {
  const fromLink = stationIdFromSearch(search, stations);
  if (fromLink !== null) return fromLink === selectedId ? null : { select: fromLink };
  return selectedId === defaultId ? null : { writeParam: selectedId };
}
