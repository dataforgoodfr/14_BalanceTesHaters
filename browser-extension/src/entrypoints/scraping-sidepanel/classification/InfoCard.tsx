import { cn } from "@/lib/utils";

export const titleTextStyle =
  "text-primary font-medium text-sm font-[Red Hat Text Variable]";

export const descriptionTextStyle =
  "font-normal text-muted-foreground text-sm font-[Red Hat Text Variable]";

/**
 * Note this is quite similar to a simple shadcn alert.
 * However it does not use the aria alert role and styles title with primary color.
 * @param param0
 */
export function InfoCard({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("w-full rounded-lg border px-4 py-3", className)}>
      {children}
    </div>
  );
}

export function InfoCardTitle({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn(titleTextStyle, className)}>{children}</div>;
}

export function InfoCardDescription({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn(descriptionTextStyle, className)}>{children}</div>;
}
