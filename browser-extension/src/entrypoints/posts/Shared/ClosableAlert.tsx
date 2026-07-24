import { useState } from "react";

import { XIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// A compléter en fonction des besoins
const closableAlertVariants = cva("card rounded-md flex gap-4", {
  variants: {
    variant: {
      info: "bg-navigation-accent text-card-foreground text-text-info",
      support: "bg-fuchsia-100 text-fuchsia-900",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

const closableAlertDescriptionVariants = cva("", {
  variants: {
    variant: {
      info: "text-text-info",
      support: "text-fuchsia-900",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

type ClosableAlertProps = {
  title: string;
  className?: string;
  icon: React.ReactNode;
  variant?: "info" | "support";
};

const ClosableAlert = ({
  children,
  className,
  title,
  icon,
  variant,
}: React.PropsWithChildren<ClosableAlertProps>) => {
  const [isActive, setIsActive] = useState(true);

  if (!isActive) return null;

  return (
    <Alert className={cn(closableAlertVariants({ variant }), className)}>
      <div className="mt-2">{icon}</div>
      <div className="flex-1 flex-col justify-center gap-1">
        <AlertTitle className="text-lg ">{title}</AlertTitle>
        <AlertDescription
          className={closableAlertDescriptionVariants({ variant })}
        >
          {children}
        </AlertDescription>
      </div>
      <button
        className="self-start cursor-pointer "
        onClick={() => setIsActive(false)}
      >
        <XIcon className="size-5" />
        <span className="sr-only">Close</span>
      </button>
    </Alert>
  );
};

export default ClosableAlert;
