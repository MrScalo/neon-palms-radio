/**
 * Keyboard model of the preset radio group: arrows move and wrap around, Home/End jump to the
 * ends, digits pick a preset like on a car radio. Null for keys the group doesn't handle.
 */
export function presetIndexForKey(key: string, index: number, count: number): number | null {
  if (count <= 0) return null;
  const from = Math.min(count - 1, Math.max(0, index));
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (from + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (from - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
  if (/^[1-9]$/.test(key)) {
    const preset = Number(key) - 1;
    return preset < count ? preset : null;
  }
  return null;
}
