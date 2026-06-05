import { useStepItemContext } from "@stepperize/react/primitives";

import { Button } from "@/components/ui/button";
import { Check, MoveLeft, MoveRight } from "lucide-react";
import { Stepper, useStepper } from "./BuildReport";
import { Link } from "react-router";

const StepperTriggerWrapper = () => {
  const item = useStepItemContext();
  const isInactive = item.status === "inactive";
  const isCompleted = item.status === "success";

  return (
    <Stepper.Trigger
      render={(domProps) => (
        <Button
          roundness="round"
          variant={isInactive ? "secondary" : "default"}
          size="icon"
          data-status={item.status}
          className="data-[status=success]:opacity-50"
          {...domProps}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <Stepper.Indicator>{item.index + 1}</Stepper.Indicator>
          )}
        </Button>
      )}
    />
  );
};

const StepperTitleWrapper = ({ title }: { title: string }) => {
  const item = useStepItemContext();

  return (
    <Stepper.Title
      render={(domProps) => (
        <h4
          data-status={item.status}
          className="text-sm font-medium data-[status=success]:opacity-50"
          {...domProps}
        >
          {title}
        </h4>
      )}
    />
  );
};

const StepperSeparatorWithLabelOrientation = ({
  isLast,
}: {
  isLast: boolean;
}) => {
  if (isLast) return null;

  return (
    <Stepper.Separator
      orientation="horizontal"
      className="absolute left-[calc(80%+10px)] right-[calc(-20%+10px)] top-5 block  bg-muted h-0.5"
    />
  );
};

export const StepperBanner = () => {
  const stepper = useStepper();

  return (
    <Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
      {stepper.state.all.map((stepData, index) => {
        const isLast = index === stepper.state.all.length - 1;
        const data = stepData as {
          id: string;
          title: string;
          description?: string;
        };
        return (
          <Stepper.Item
            key={stepData.id}
            step={stepData.id}
            className="group peer relative flex w-full flex-col items-center justify-center gap-2"
          >
            <div className="flex items-center gap-2">
              <StepperTriggerWrapper />
              <StepperTitleWrapper title={data.title} />
            </div>
            <StepperSeparatorWithLabelOrientation isLast={isLast} />
          </Stepper.Item>
        );
      })}
    </Stepper.List>
  );
};

export const StepperActions = () => {
  const stepper = useStepper();
  return (
    <div className="sticky bottom-0 border-t py-4 bg-background">
      <Stepper.Actions className="flex justify-center gap-6">
        {stepper.state.isFirst ? (
          <Button
            roundness="round"
            type="button"
            className="w-1/6"
            variant="secondary"
            render={<Link to="/">Annuler</Link>}
          ></Button>
        ) : (
          <Stepper.Prev
            render={(domProps) => (
              <Button
                roundness="round"
                type="button"
                className="w-1/6"
                variant="secondary"
                {...domProps}
              >
                <MoveLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
            )}
          />
        )}

        {stepper.state.isLast ? (
          <Button
            roundness="round"
            type="submit"
            form={getFormId(stepper.state.current.data.id)}
            className="w-1/6"
          >
            Générer le rapport
          </Button>
        ) : (
          <Button
            roundness="round"
            type="submit"
            form={getFormId(stepper.state.current.data.id)}
            className="w-1/6"
          >
            Suivant <MoveRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </Stepper.Actions>
    </div>
  );
};

export function getFormId(stepId: string) {
  return `${stepId}-form`;
}
