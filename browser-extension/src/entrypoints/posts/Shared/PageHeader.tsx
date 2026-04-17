
function PageHeader({ title }: Readonly<{ title: string }>) {
  return (
      <h4 className="text-left border-b -mx-4 px-4 pb-4">{title}</h4>
  );
}

export default PageHeader;
