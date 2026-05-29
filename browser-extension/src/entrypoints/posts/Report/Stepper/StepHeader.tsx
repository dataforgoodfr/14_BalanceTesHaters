interface StepHeaderProps {
  title: string;
  subTitle: string;
}

export const StepHeader = ({ title, subTitle }: StepHeaderProps) => {
  return (
    <div className="flex flex-col ">
      <h2 className="text-2xl">{title}</h2>
      <span className="text-xl text-muted-foreground mt-0">{subTitle}</span>
    </div>
  );
};
