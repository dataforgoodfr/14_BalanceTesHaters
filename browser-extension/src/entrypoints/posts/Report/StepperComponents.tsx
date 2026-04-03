import { StepStatus, useStepItemContext } from "@stepperize/react/primitives";

import { Button } from "@/components/ui/button";
import { Check, MoveLeft, MoveRight } from "lucide-react";
import { Stepper, useStepper } from "./BuildReport";

const StepperTriggerWrapper = () => {
  const item = useStepItemContext();
  const isInactive = item.status === "inactive";
  const isCompleted = item.status === "success";

  return (
    <Stepper.Trigger
      render={(domProps) => (
        <Button
          className="rounded-full"
          variant={isInactive ? "secondary" : "default"}
          size="icon"
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
  return (
    <Stepper.Title
      render={(domProps) => (
        <h4 className="text-sm font-medium" {...domProps}>
          {title}
        </h4>
      )}
    />
  );
};

const StepperDescriptionWrapper = ({
  description,
}: {
  description?: string;
}) => {
  if (!description) return null;
  return (
    <Stepper.Description
      render={(domProps) => (
        <p className="text-xs text-muted-foreground" {...domProps}>
          {description}
        </p>
      )}
    />
  );
};

const StepperSeparatorWithLabelOrientation = ({
  status,
  isLast,
}: {
  status: StepStatus;
  isLast: boolean;
}) => {
  if (isLast) return null;

  return (
    <Stepper.Separator
      orientation="horizontal"
      data-status={status}
      className="absolute left-[calc(50%+30px)] right-[calc(-50%+20px)] top-5 block shrink-0 bg-muted data-[status=success]:bg-primary data-disabled:opacity-50 transition-all duration-300 ease-in-out h-0.5"
    />
  );
};

export const StepperBanner = () => {
  const stepper = useStepper();

  return (
    <Stepper.List className="flex list-none gap-2 flex-row items-center justify-between">
      {stepper.state.all.map((stepData, index) => {
        const currentIndex = stepper.state.current.index;
        let status = "inactive";
        if (index < currentIndex) {
          status = "success";
        } else if (index === currentIndex) {
          status = "active";
        }
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
            <StepperTriggerWrapper />
            <StepperSeparatorWithLabelOrientation
              status={status as StepStatus}
              isLast={isLast}
            />
            <div className="flex flex-col items-center text-center gap-1">
              <StepperTitleWrapper title={data.title} />
              <StepperDescriptionWrapper description={data.description} />
            </div>
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
        <Stepper.Prev
          render={(domProps) => (
            <Button type="button" className="w-1/6" {...domProps}>
              <MoveLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
          )}
        />

        {stepper.state.isLast ? (
          <Button
            type="submit"
            form={getFormId(stepper.state.current.data.id)}
            className="w-1/6"
          >
            Générer le rapport
          </Button>
        ) : (
          <Button
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
