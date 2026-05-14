export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5 space-y-4 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 skeleton" />
          <div className="h-3 w-20 skeleton" />
        </div>
      </div>
      <div className="h-6 w-24 skeleton rounded-full" />
      <div className="space-y-2">
        <div className="h-3 w-full skeleton" />
        <div className="h-3 w-3/4 skeleton" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-fadeIn">
      <div className="w-10 h-10 rounded-full skeleton" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 skeleton" />
        <div className="h-3 w-24 skeleton" />
      </div>
      <div className="h-4 w-16 skeleton" />
    </div>
  );
}

export function SkeletonText({ width = "w-full", height = "h-4" }) {
  return <div className={`${width} ${height} skeleton`} />;
}
