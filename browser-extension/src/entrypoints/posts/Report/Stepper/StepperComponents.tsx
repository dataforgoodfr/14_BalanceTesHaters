import { Button } from "@/components/ui/button";
import { Check, MoveLeft, MoveRight } from "lucide-react";
import { Stepper, useStepper } from "./BuildReport";
import { Link } from "react-router";

const StepperTriggerWrapper = ({
  status,
  index,
}: {
  status: ReturnType<ReturnType<typeof useStepper>["status"]>;
  index: number;
}) => {
  const isInactive = status === "upcoming";
  const isCompleted = status === "previous";

  return (
    <Stepper.Trigger
      render={(domProps) => (
        <Button
          roundness="round"
          variant={isInactive ? "secondary" : "default"}
          size="icon"
          data-status={status}
          className="data-[status=previous]:opacity-50"
          {...domProps}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : (
            <Stepper.Indicator>{index + 1}</Stepper.Indicator>
          )}
        </Button>
      )}
    />
  );
};

const StepperTitleWrapper = ({
  title,
  status,
}: {
  title: string;
  status: ReturnType<ReturnType<typeof useStepper>["status"]>;
}) => {
  return (
    <Stepper.Title
      render={(domProps) => (
        <h4
          data-status={status}
          className="text-sm font-medium opacity-50 data-[status=active]:opacity-100"
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
      className="absolute max-lg:hidden lg:left-[calc(90%+10px)] lg:right-[calc(-10%+10px)] xl:left-[calc(85%+10px)] xl:right-[calc(-15%+10px)] 2xl:left-[calc(80%+10px)] 2xl:right-[calc(-20%+10px)] top-5 block  bg-muted h-0.5"
    />
  );
};

export const StepperBanner = () => {
  const stepper = useStepper();

  return (
    <Stepper.List className="flex list-none flex-row items-center justify-between max-w-3/4 mx-auto">
      {stepper.steps.map((stepData, index) => {
        const isLast = index === stepper.steps.length - 1;
        const status = stepper.status(stepData.id);
        return (
          <Stepper.Item
            key={stepData.id}
            step={stepData.id}
            className="group peer relative flex w-full flex-col items-center justify-center gap-2"
          >
            <div className="flex items-center gap-2">
              <StepperTriggerWrapper status={status} index={index} />
              <StepperTitleWrapper title={stepData.title} status={status} />
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
    <div className="fixed bottom-0 w-full border-t py-8 bg-background">
      <Stepper.Actions className="flex justify-center gap-6">
        {stepper.isFirst ? (
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

        {stepper.isLast ? (
          <Button
            roundness="round"
            type="submit"
            form={getFormId(stepper.current.id)}
            className="w-1/6"
          >
            Générer le rapport
          </Button>
        ) : (
          <Button
            roundness="round"
            type="submit"
            form={getFormId(stepper.current.id)}
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
