export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const h = Math.abs(hash) % 360;
  const s = 40 + (Math.abs(hash >> 8) % 25);
  const l = 28 + (Math.abs(hash >> 16) % 15);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    const rem = minutes % 60;
    return `${hours}h ${rem}m`;
  }
  return `${minutes}m`;
}

export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function generateUsername(displayName: string, existingSlugs: Set<string>): string {
  const base = slugify(displayName) || "user";
  if (!existingSlugs.has(base)) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existingSlugs.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

export function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function rankKeysByCount<T>(
  items: T[],
  keyFn: (item: T) => string,
  options?: { latestFn?: (item: T) => number }
): string[] {
  const stats = new Map<string, { count: number; latest: number }>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const key = keyFn(item);
    const latest = options?.latestFn ? options.latestFn(item) : i;
    const prev = stats.get(key);
    if (!prev) {
      stats.set(key, { count: 1, latest });
    } else {
      stats.set(key, {
        count: prev.count + 1,
        latest: Math.max(prev.latest, latest),
      });
    }
  }
  return Array.from(stats.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].latest - a[1].latest;
    })
    .map(([key]) => key);
}
