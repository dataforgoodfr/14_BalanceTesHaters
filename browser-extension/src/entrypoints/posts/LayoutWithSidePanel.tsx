import SidePanelMenu from "./SidePanelMenu";

function LayoutWithSidePanel({page}: Readonly<{page: React.ReactNode}>) {
  return (
    <>
      <div className="w-[210px] flex-none overflow-y-auto">
        <SidePanelMenu />
      </div>
      <div className="flex-grow flex-shrink flex overflow-y-auto">
        {page}
      </div>
    </>
  );
}

export default LayoutWithSidePanel;
