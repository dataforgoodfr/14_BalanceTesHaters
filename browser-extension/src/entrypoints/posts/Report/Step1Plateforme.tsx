import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

function Step1Plateforme() {
  return (
    <div className="flex flex-col gap-6 h-9/12 ">
      <h1 className=" ">
        Sur quelle plateforme se trouvent les publications à inclure dans ce
        rapport ?
      </h1>

      <FieldGroup className="mt-2 w-1/12 mx-auto items-center gap-5">
        <Field orientation="horizontal" className="">
          <Checkbox id="YOUTUBE" name="YOUTUBE" />
          <Label htmlFor="YOUTUBE">YouTube</Label>
        </Field>
        <Field orientation="horizontal" className="">
          <Checkbox id="INSTAGRAM" name="INSTAGRAM" />
          <Label htmlFor="INSTAGRAM">Instagram</Label>
        </Field>
      </FieldGroup>
    </div>
  );
}

export default Step1Plateforme;
