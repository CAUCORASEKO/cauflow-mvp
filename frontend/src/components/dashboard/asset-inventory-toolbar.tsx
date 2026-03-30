import { Grid2X2, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export type AssetImageFilter = "all" | "with-image" | "without-image";
export type AssetSortOrder = "newest" | "oldest";
export type AssetViewMode = "grid" | "list";

export function AssetInventoryToolbar({
  searchQuery,
  onSearchQueryChange,
  imageFilter,
  onImageFilterChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange,
  filteredCount,
  totalCount
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  imageFilter: AssetImageFilter;
  onImageFilterChange: (value: AssetImageFilter) => void;
  sortOrder: AssetSortOrder;
  onSortOrderChange: (value: AssetSortOrder) => void;
  viewMode: AssetViewMode;
  onViewModeChange: (value: AssetViewMode) => void;
  filteredCount: number;
  totalCount: number;
}) {
  return (
    <div className="sticky top-3 z-10 rounded-[26px] border border-white/10 bg-slate-950/80 p-4 shadow-[0_24px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Inventory controls
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {filteredCount === totalCount
                ? `${totalCount} assets in catalog`
                : `${filteredCount} of ${totalCount} assets shown`}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
            <Button
              type="button"
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              className="h-9 rounded-full px-3"
              onClick={() => onViewModeChange("grid")}
              aria-pressed={viewMode === "grid"}
            >
              <Grid2X2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewMode === "list" ? "secondary" : "ghost"}
              className="h-9 rounded-full px-3"
              onClick={() => onViewModeChange("list")}
              aria-pressed={viewMode === "list"}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div className="min-w-0 xl:min-w-[280px] xl:flex-[1.15_1_0%]">
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search by asset title or description"
            />
          </div>
          <div className="xl:w-[220px] xl:flex-none">
            <Select
              value={imageFilter}
              onChange={(event) => onImageFilterChange(event.target.value as AssetImageFilter)}
            >
              <option value="all">All assets</option>
              <option value="with-image">With preview</option>
              <option value="without-image">Without preview</option>
            </Select>
          </div>
          <div className="relative xl:w-[180px] xl:flex-none">
            <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Select
              value={sortOrder}
              onChange={(event) => onSortOrderChange(event.target.value as AssetSortOrder)}
              className="pl-11"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </Select>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm xl:flex-none"
            onClick={() => {
              onSearchQueryChange("");
              onImageFilterChange("all");
              onSortOrderChange("newest");
            }}
          >
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
