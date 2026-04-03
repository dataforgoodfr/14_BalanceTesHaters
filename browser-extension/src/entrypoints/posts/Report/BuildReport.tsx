import { defineStepper } from "@stepperize/react";
import React from "react";

import Step1Plateforme from "./Step1Plateforme";
import Step2Posts from "./Step2Posts";
import Step3Comments from "./Step3Comments";
import { PostCommentWithId } from "../Posts/CommentsTable";
import Step4Organization from "./Step4Organization";
import { StepperActions, StepperBanner } from "./StepperComponents";
import Report from "./Report";

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

  const [displayReport, setDisplayReport] = React.useState<boolean>(false);

  return (
    <div className="p-4 flex flex-col gap-6 w-full mx-auto">
      {!displayReport && (
        <BthStepper
          reportQueryData={reportQueryData}
          setReportQueryData={setReportQueryData}
          setDisplayReport={setDisplayReport}
        />
      )}
      {displayReport && (
        <Report reportQueryData={reportQueryData} />
      )}
    </div>
  );
}

const BthStepper = ({
  setReportQueryData,
  reportQueryData,
  setDisplayReport,
}: {
  setReportQueryData: React.Dispatch<
    React.SetStateAction<ReportQueryData | undefined>
  >;
  reportQueryData: ReportQueryData | undefined;
  setDisplayReport: (displayReport: boolean) => void;
}) => {
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
    <>
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
            setDisplayReport={setDisplayReport}
            reportQueryData={reportQueryData}
          />
          <StepperActions />
        </Stepper.Root>
      </Scoped>
    </>
  );
};

const StepContent = ({
  setSocialNetworkList,
  setPostIdList,
  setCommentList,
  setReportOrganizationType,
  setDisplayReport,
  reportQueryData,
}: {
  setSocialNetworkList: (socialNetworkList: string[]) => void;
  setPostIdList: (postList: string[]) => void;
  setCommentList: (commentList: PostCommentWithId[]) => void;
  setReportOrganizationType: (
    reportOrgainzationType: ReportOrganizationType,
  ) => void;
  setDisplayReport: (displayReport: boolean) => void;
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
          setDisplayReport={setDisplayReport}
        />
      ))}
    </div>
  );
};
