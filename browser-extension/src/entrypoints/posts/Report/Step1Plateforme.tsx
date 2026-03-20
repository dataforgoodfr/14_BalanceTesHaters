import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useStepper, getFormId } from "./BuildReport"; // or wherever the export is
import { useForm } from "@tanstack/react-form";

function Step1Plateforme() {
  const stepper = useStepper();

  const form = useForm({
    defaultValues: { socialNetworkList: [] as string[] },
    onSubmit: () => {
      if (!stepper.state.isLast) stepper.navigation.next();
    },
  });

  const options = [
    { id: "instagram", label: "Instagram" },
    { id: "youtube", label: "YouTube" },
  ];

  return (
    <div className=" gap-6 h-9/12 ">
      <h1 className="mb-3">
        Sur quelle plateforme se trouvent les publications à inclure dans ce
        rapport ?
      </h1>
      <form
        id={getFormId(stepper.state.current.data.id)}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6 p-4 flex justify-center"
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
            <FieldGroup className="mt-2 gap-5 max-w-2xs w-2/3 ">
              {options.map((option) => (
                <Field orientation="horizontal" key={option.id}>
                  <Checkbox
                    id={option.id}
                    checked={field.state.value.includes(option.id)}
                    onCheckedChange={(checked) => {
                      const currentValue = field.state.value;
                      const nextValue = checked
                        ? [...currentValue, option.id]
                        : currentValue.filter((val) => val !== option.id);

                      field.handleChange(nextValue);
                    }}
                  />
                  <Label
                    htmlFor={option.id}
                    className="font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </Field>
              ))}

              {/* Error display */}
              {field.state.meta.errors.length > 0 && (
                <span className="text-destructive text-sm mt-2">
                  {field.state.meta.errors.join(", ")}
                </span>
              )}
            </FieldGroup>
          )}
        </form.Field>
      </form>
    </div>
  );
}

export default Step1Plateforme;
