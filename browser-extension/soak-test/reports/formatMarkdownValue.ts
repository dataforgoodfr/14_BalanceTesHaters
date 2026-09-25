export function formatDuration(
  value: number | undefined,
  fractionDigits = 1,
): string {
  return value === undefined
    ? "n/a"
    : `${(value / 1000).toFixed(fractionDigits)} s`;
}

export function formatInteger(value: number | undefined): string {
  return value === undefined ? "n/a" : String(value);
}

export function formatBytes(value: number | undefined): string {
  return value === undefined
    ? "n/a"
    : `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

export function formatPercentage(value: number | undefined): string {
  return value === undefined ? "n/a" : `${value.toFixed(1)}%`;
}

export function formatStatusWithEmoji(status: string): string {
  if (status === "success" || status === "completed") {
    return `🟢 ${status}`;
  }
  if (status === "running") {
    return `▶️ ${status}`;
  }
  if (status === "waiting") {
    return `⏳ ${status}`;
  }
  if (status === "warning" || status === "not-run") {
    return `🟠 ${status}`;
  }
  return `🔴 ${status}`;
}
