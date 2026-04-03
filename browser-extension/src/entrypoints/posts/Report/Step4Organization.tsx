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

function Step4Organization({
  setReportOrganizationType,
  setDisplayReport
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
      id: ReportOrganizationType.BY_PUBLICATION.toString(),
      label: "Par publication (par défaut)",
    },
    { id: ReportOrganizationType.BY_AUTHOR.toString(), label: "Par auteur" },
  ];

  return (
    <>
      <span className="text-xl font-bold mb-3">
        Comment souhaitez-vous organiser ce rapport ?
      </span>
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
              defaultValue={ReportOrganizationType.BY_PUBLICATION}
              className="flex flex-col items-left gap-3 "
              onChange={(event) => {
                field.handleChange((event.target as HTMLInputElement).id);
              }}
            >
              {options.map((option) => (
                <div className="flex items-center gap-3" key={option.id}>
                  <RadioGroupItem id={option.id.toString()} value={option.id} />
                  <Label
                    htmlFor={option.id.toString()}
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
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
