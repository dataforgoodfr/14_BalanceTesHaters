import KpiCards from "./KpiCards";
import HarassmentTrendChart from "./HarassmentTrendChard";
import ActiveAuthors from "./ActiveAuthors";
import CategoryDistribution from "./CategoryDistribution";
import SourceSelector from "./SourceSelector";
import DateRangePicker from "./DateRangePicker";

function HomePage() {
  return (
    <div className="p-4">
      <h1 className="mt-2 mb-5">Vue d&apos;ensemble</h1>
      <div className="flex justify-between mb-5">
        <SourceSelector />
        <DateRangePicker />
      </div>

      <KpiCards />

      <HarassmentTrendChart />
      <div className="flex gap-4">
        <ActiveAuthors />
        <CategoryDistribution />
      </div>
    </div>
  );
}

export default HomePage;
