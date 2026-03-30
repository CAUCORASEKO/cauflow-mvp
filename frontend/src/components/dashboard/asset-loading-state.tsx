export function AssetLoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-white/8 bg-white/[0.025]"
        >
          <div className="aspect-[5/4] animate-pulse bg-white/[0.04]" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-7 w-2/3 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-3 w-full animate-pulse rounded-full bg-white/[0.05]" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}
