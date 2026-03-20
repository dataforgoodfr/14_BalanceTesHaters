"use client";

import { defineStepper, Get } from "@stepperize/react";
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives";

import { Button } from "@/components/ui/button";
import { Check, CircleCheck, Move, MoveLeft, MoveRight } from "lucide-react";
import Step1Plateforme from "./Step1Plateforme";
import { Link } from "react-router";
import { Separator } from "@/components/ui/separator";

const { Stepper, ...stepperDefinition } = defineStepper(
  {
    id: "step-1",
    title: "Plateforme",
  },
  {
    id: "step-2",
    title: "Publications",
  },
  {
    id: "step-3",
    title: "Commentaires",
  },
  {
    id: "step-4",
    title: "Organisation",
  },
);

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

export function BuildReport() {
  return (
    <div className="p-4 flex flex-col gap-6 w-full ">
      {/* Header */}
      <div className="sticky top-0"></div>
      <p>
        Suivez les 4 étapes pour constituer un rapport et exportez-le dans un
        format souhaité.
      </p>
      <Stepper.Root
        className="w-full h-full space-y-4"
        orientation="horizontal"
      >
        {({ stepper }) => (
          <>
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
                      <StepperDescriptionWrapper
                        description={data.description}
                      />
                    </div>
                  </Stepper.Item>
                );
              })}
            </Stepper.List>
            {stepper.flow.switch({
              "step-1": () => <Step1Plateforme />,
              "step-2": (data) => <Content id={data.id} />,
              "step-3": (data) => <Content id={data.id} />,
              "step-4": (data) => <Content id={data.id} />,
            })}

            {/* Footer */}
            <div className="sticky bottom-0 border-t pt-4">
              <Stepper.Actions className="flex justify-center gap-6">
                {!stepper.state.isLast && (
                  <Stepper.Prev
                    render={(domProps) => (
                      <Button type="button" className="w-1/6" {...domProps}>
                       <MoveLeft className="h-4 w-4 mr-1" /> Précédent 
                      </Button>
                    )}
                  />
                )}
                {stepper.state.isLast ? (
                  <Button
                    type="button"
                    className="w-1/6"
                    onClick={() => stepper.navigation.reset()}
                  >
                    Générer le rapport
                  </Button>
                ) : (
                  <Stepper.Next
                    render={(domProps) => (
                      <Button type="button" className="w-1/6" {...domProps}>
                        Suivant <MoveRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  />
                )}
              </Stepper.Actions>
            </div>
          </>
        )}
      </Stepper.Root>
    </div>
  );
}

const Content = ({ id }: { id: Get.Id<typeof stepperDefinition.steps> }) => {
  return (
    <Stepper.Content
      step={id}
      render={(props) => (
        <div
          {...props}
          className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8"
        >
          <p className="text-xl font-normal">Content for {id}</p>
        </div>
      )}
    />
  );
};
