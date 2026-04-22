export default function DashboardLoading() {
  return (
    <div className="min-h-screen">
      <div className="px-8 py-6 border-b border-[#1e2d4a] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1a2235] animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-[#1a2235] rounded animate-pulse" />
            <div className="h-3 w-60 bg-[#1a2235] rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-8 py-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[#1a2235] border border-[#1e2d4a] animate-pulse" />
        ))}
      </div>
      <div className="px-8 pb-8 space-y-8">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s}>
            <div className="h-4 w-24 bg-[#1a2235] rounded animate-pulse mb-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-[#1a2235] border border-[#1e2d4a] animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
