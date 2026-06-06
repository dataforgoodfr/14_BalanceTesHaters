import { cn } from "@/lib/utils";

export function LongComponent({ nbItems = 4000 }: { nbItems?: number }) {
  const numbers = useMemo(() => {
    return Array(nbItems)
      .fill(0)
      .map((_, index) => index);
  }, [nbItems]);
  return (
    <table>
      <tbody>
        {numbers.map((v) => (
          <tr key={v}>
            <td className="w-20 tabular-nums text-right px-2">{v + 1}</td>
            <td
              className={cn(
                " w-20",
                [
                  "bg-white",
                  "bg-teal-100",
                  "bg-teal-200",
                  "bg-teal-300",
                  "bg-teal-400",
                  "bg-teal-500",
                  "bg-teal-600",
                  "bg-teal-700",
                  "bg-teal-800",
                  "bg-teal-900",
                ][v % 10],
              )}
            ></td>
            <td
              className={cn(
                " w-20",
                [
                  "bg-white",
                  "bg-cyan-100",
                  "bg-cyan-200",
                  "bg-cyan-300",
                  "bg-cyan-400",
                  "bg-cyan-500",
                  "bg-cyan-600",
                  "bg-cyan-700",
                  "bg-cyan-800",
                  "bg-cyan-900",
                ][Math.floor(v / 10) % 10],
              )}
            ></td>
            <td
              className={cn(
                " w-20",
                [
                  "bg-white",
                  "bg-indigo-100",
                  "bg-indigo-200",
                  "bg-indigo-300",
                  "bg-indigo-400",
                  "bg-indigo-500",
                  "bg-indigo-600",
                  "bg-indigo-700",
                  "bg-indigo-800",
                  "bg-indigo-900",
                ][Math.floor(v / 100) % 10],
              )}
            ></td>
            <td
              className={cn(
                " w-20",
                [
                  "bg-white",
                  "bg-purple-100",
                  "bg-purple-200",
                  "bg-purple-300",
                  "bg-purple-400",
                  "bg-purple-500",
                  "bg-purple-600",
                  "bg-purple-700",
                  "bg-purple-800",
                  "bg-purple-900",
                ][Math.floor(v / 1000) % 10],
              )}
            ></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
