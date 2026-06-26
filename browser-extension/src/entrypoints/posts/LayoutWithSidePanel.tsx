import SidePanelMenu from "./SidePanelMenu";

function LayoutWithSidePanel({ page }: Readonly<{ page: React.ReactNode }>) {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <div className="w-[250px] flex-none overflow-y-auto p-2">
        <SidePanelMenu />
      </div>
      <div className="flex-grow flex-shrink flex overflow-y-auto">{page}</div>
    </div>
  );
}

export default LayoutWithSidePanel;
