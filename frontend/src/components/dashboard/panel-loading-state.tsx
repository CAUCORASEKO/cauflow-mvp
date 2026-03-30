export function PanelLoadingState({
  title
}: {
  title: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-6">
      <div className="space-y-4">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/[0.05]" />
        <div className="h-8 w-40 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-3 w-72 max-w-full animate-pulse rounded-full bg-white/[0.05]" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-[22px] border border-white/8 bg-slate-950/45 p-4"
          >
            <div className="h-4 w-1/3 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  );
}
