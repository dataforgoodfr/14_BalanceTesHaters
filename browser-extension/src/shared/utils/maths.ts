export function getPercentage(part: number, total: number): number {
  if (total === 0) {
    return 0;
  } else {
    return (part / total) * 100;
  }
}
