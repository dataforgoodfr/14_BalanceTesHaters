import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrafficCone } from "lucide-react";

export default function WorkInProgress() {
  return (
    <div className="absolute top-2 right-2">
      <Tooltip>
        <TooltipTrigger>
          <TrafficCone
            color="orange"
            className="h-6 w-6 p-1 border rounded-full border-orange-500 "
          />
        </TooltipTrigger>
        <TooltipContent>En cours de développement</TooltipContent>
      </Tooltip>
    </div>
  );
}
