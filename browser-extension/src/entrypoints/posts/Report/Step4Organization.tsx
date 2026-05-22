import { Label } from "@/components/ui/label";
import {
  useStepper,
  ReportQueryData,
  ReportOrganizationType,
} from "./BuildReport"; // or wherever the export is
import { useForm } from "@tanstack/react-form";
import { RadioGroup } from "@base-ui/react";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { getFormId } from "./StepperComponents";
import { StepHeader } from "./StepHeader";
import { FileText, UserRound } from "lucide-react";
import WorkInProgress from "../WorkInProgress";
import { cn } from "@/lib/utils";

function Step4Organization({
  setReportOrganizationType,
  setDisplayReport,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setReportOrganizationType: (
    reportOrganizationType: ReportOrganizationType,
  ) => void;
  setDisplayReport: (displayReport: boolean) => void;
}>) {
  const stepper = useStepper();

  const form = useForm({
    defaultValues: {
      reportOrganizationType: ReportOrganizationType.BY_PUBLICATION.toString(),
    },
    onSubmit: () => {},
  });

  const options = [
    {
      id: ReportOrganizationType.BY_AUTHOR.toString(),
      label: "Par auteur (recommandé)",
      description:
        "Idéal pour un dossier juridique prêt à remettre aux autorités",
      icon: <UserRound />,
      disabled: true,
    },
    {
      id: ReportOrganizationType.BY_PUBLICATION.toString(),
      label: "Par publication",
      description:
        "Pratique si l’objectif est de traiter une vidéo/un post à la fois",
      icon: <FileText />,
      disabled: false,
    },
  ];

  return (
    <>
      <StepHeader
        title="Choisis l’organisation du rapport"
        subTitle="Sélectionne la structure la plus adaptée à l’objectif du dossier."
      />
      <form
        id={getFormId(stepper.state.current.data.id)}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setReportOrganizationType(
            form.state.values.reportOrganizationType as ReportOrganizationType,
          );
          setDisplayReport(true);
        }}
        className="space-y-6 p-4 flex justify-center"
      >
        <form.Field name="reportOrganizationType">
          {(field) => (
            <RadioGroup
              defaultValue={ReportOrganizationType.BY_PUBLICATION.toString()}
              className="flex flex-col items-left gap-3 "
              onChange={(event) => {
                field.handleChange((event.target as HTMLInputElement).id);
              }}
            >
              {options.map((option) => (
                <Label
                  className={cn(
                    option.disabled && "opacity-50",
                    "relative justify-center border border-border rounded-md p-4 flex items-center gap-3 has-aria-checked:bg-selected has-aria-checked:border-selected-accent",
                  )}
                  key={option.id}
                >
                  {option.disabled && <WorkInProgress />}
                  <RadioGroupItem
                    id={option.id.toString()}
                    value={option.id}
                    className="hidden"
                    disabled={option.disabled}
                  />
                  {option.icon}

                  <div className="flex flex-col gap-2 items-start">
                    <span className="font-semibold">{option.label}</span>
                    <span className="font-medium">{option.description}</span>
                  </div>
                </Label>
              ))}

              {/* Error display */}
              {field.state.meta.errors.length > 0 && (
                <span className="text-destructive text-sm mt-2">
                  {field.state.meta.errors.join(", ")}
                </span>
              )}
            </RadioGroup>
          )}
        </form.Field>
      </form>
    </>
  );
}

export default Step4Organization;
