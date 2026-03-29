import { defineStepper } from "@stepperize/react";
import { StepStatus, useStepItemContext } from "@stepperize/react/primitives";
import React from "react";

import { Button } from "@/components/ui/button";
import { Check, MoveLeft, MoveRight } from "lucide-react";
import Step1Plateforme from "./Step1Plateforme";
import Step2Posts from "./Step2Posts";
import Step3Comments from "./Step3Comments";
import { PostCommentWithId } from "../Posts/CommentsTable";
import Step4Organization from "./Step4Organization";

export enum ReportOrganizationType {
  BY_PUBLICATION = "BY_PUBLICATION",
  BY_AUTHOR = "BY_AUTHOR",
}

const DEFAULT_REPORT_ORGANIZATION_TYPE = ReportOrganizationType.BY_PUBLICATION;

export type ReportQueryData = {
  socialNetworkList: string[];
  postIdList: string[];
  postCommentList: PostCommentWithId[];
  reportOrganizationType: ReportOrganizationType;
};

export const { Scoped, Stepper, useStepper, ...stepperDefinition } =
  defineStepper(
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

export function BuildReport() {
  const [reportQueryData, setReportQueryData] =
    React.useState<ReportQueryData>();

  const setSocialNetworkList = (socialNetworkList: string[]) => {
    setReportQueryData(() => ({
      socialNetworkList,
      postIdList: [],
      postCommentList: [],
      reportOrganizationType: DEFAULT_REPORT_ORGANIZATION_TYPE,
    }));
  };

  const setPostIdList = (postIdList: string[]) => {
    setReportQueryData((prev) => ({
      socialNetworkList: prev?.socialNetworkList ?? [],
      postIdList,
      postCommentList: [],
      reportOrganizationType: DEFAULT_REPORT_ORGANIZATION_TYPE,
    }));
  };

  const setCommentList = (postCommentList: PostCommentWithId[]) => {
    setReportQueryData((prev) => ({
      socialNetworkList: prev?.socialNetworkList ?? [],
      postIdList: prev?.postIdList ?? [],
      postCommentList: postCommentList,
      reportOrganizationType: DEFAULT_REPORT_ORGANIZATION_TYPE,
    }));
  };

  const setReportOrganizationType = (
    reportOrganizationType: ReportOrganizationType,
  ) => {
    setReportQueryData((prev) => ({
      socialNetworkList: prev?.socialNetworkList ?? [],
      postIdList: prev?.postIdList ?? [],
      postCommentList: prev?.postCommentList ?? [],
      reportOrganizationType: reportOrganizationType,
    }));
  };

  return (
    <div className="p-4 flex flex-col gap-6 w-full mx-auto">
      {/* Header */}
      <div className="sticky top-0"></div>
      <p>
        Suivez les 4 étapes pour constituer un rapport et exportez-le dans un
        format souhaité.
      </p>

      <Scoped>
        <Stepper.Root
          className="w-full h-full space-y-4"
          orientation="horizontal"
        >
          <StepperBanner />
          <StepContent
            setSocialNetworkList={setSocialNetworkList}
            setPostIdList={setPostIdList}
            setCommentList={setCommentList}
            setReportOrganizationType={setReportOrganizationType}
            reportQueryData={reportQueryData}
          />
          <StepperActions />
        </Stepper.Root>
      </Scoped>
    </div>
  );
}

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

const StepperBanner = () => {
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

const StepperActions = () => {
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

const StepContent = ({
  setSocialNetworkList,
  setPostIdList,
  setCommentList,
  setReportOrganizationType,
  reportQueryData,
}: {
  setSocialNetworkList: (socialNetworkList: string[]) => void;
  setPostIdList: (postList: string[]) => void;
  setCommentList: (commentList: PostCommentWithId[]) => void;
  setReportOrganizationType: (
    reportOrgainzationType: ReportOrganizationType,
  ) => void;
  reportQueryData: ReportQueryData | undefined;
}) => {
  const stepper = useStepper();
  return (
    <div className="pt-4">
      {stepper.flow.when("step-1", () => (
        <Step1Plateforme
          setSocialNetworkList={setSocialNetworkList}
          reportQueryData={reportQueryData}
        />
      ))}
      {stepper.flow.when("step-2", () => (
        <Step2Posts
          reportQueryData={reportQueryData}
          setPostList={setPostIdList}
        />
      ))}
      {stepper.flow.when("step-3", () => (
        <Step3Comments
          reportQueryData={reportQueryData}
          setCommentList={setCommentList}
        />
      ))}
      {stepper.flow.when("step-4", () => (
        <Step4Organization
          reportQueryData={reportQueryData}
          setReportOrganizationType={setReportOrganizationType}
        />
      ))}
    </div>
  );
};

export function getFormId(stepId: string) {
  return `${stepId}-form`;
}
