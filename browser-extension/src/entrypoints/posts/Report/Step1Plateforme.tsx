import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useStepper, ReportQueryData } from "./BuildReport"; // or wherever the export is
import { useForm } from "@tanstack/react-form";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";
import { getFormId } from "./StepperComponents";
import { StepHeader } from "./StepHeader";
import youtubeLogoUrl from "~/assets/youtube-logo.svg";
import instagramLogoUrl from "~/assets/instagram-logo.svg";

function Step1Plateforme({
  reportQueryData,
  setSocialNetworkList,
}: Readonly<{
  reportQueryData: ReportQueryData | undefined;
  setSocialNetworkList: (socialNetworkList: string[]) => void;
}>) {
  const stepper = useStepper();

  const form = useForm({
    defaultValues: {
      socialNetworkList: reportQueryData?.socialNetworkList ?? [],
    },
    onSubmit: () => {
      setSocialNetworkList(form.state.values.socialNetworkList);
      void stepper.navigation.next();
    },
  });

  const options: { id: string; label: string; url: string }[] = [
    { id: SocialNetwork.YouTube, label: "YouTube", url: youtubeLogoUrl },
    { id: SocialNetwork.Instagram, label: "Instagram", url: instagramLogoUrl },
  ];

  return (
    <>
      <StepHeader
        title="Sélectionne une plateforme"
        subTitle="Choisis la plateforme sur laquelle se trouvent les publications à inclure."
      />

      <form
        id={getFormId(stepper.state.current.data.id)}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-6 p-4 flex flex-col items-center"
      >
        <form.Field
          name="socialNetworkList"
          validators={{
            onChange: ({ value }) =>
              value.length < 1
                ? "Sélectionner au moins une plateforme"
                : undefined,
          }}
        >
          {(field) => (
            <>
              <div className="flex items-center mt-2 gap-4">
                {options.map((option) => (
                  <Field
                    orientation="horizontal"
                    key={option.id}
                    className=" has-[[aria-checked=true]]:bg-selected has-[[aria-checked=true]]:border-selected-accent"
                  >
                    <Label className="w-[256px] justify-center border border-border rounded-md p-4">
                      <Checkbox
                        id={option.id}
                        className="hidden"
                        checked={field.state.value.includes(option.id)}
                        onCheckedChange={(checked) => {
                          const currentValue = field.state.value;
                          const nextValue = checked
                            ? [...currentValue, option.id]
                            : currentValue.filter((val) => val !== option.id);

                          field.handleChange(nextValue);
                        }}
                      />
                      <div className="flex flex-col items-center gap-3 ">
                        <img
                          src={option.url}
                          className="w-8 h-8"
                          alt="Logo"
                        ></img>
                        <span className="font-semibold">{option.label}</span>
                      </div>
                    </Label>
                  </Field>
                ))}
              </div>
              
              {/* Error display */}
              {field.state.meta.errors.length > 0 && (
                <span className="text-destructive text-sm mt-2">
                  {field.state.meta.errors.join(", ")}
                </span>
              )}
            </>
          )}
        </form.Field>
      </form>
    </>
  );
}

export default Step1Plateforme;
