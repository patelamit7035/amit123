import type { Creative } from "@/types/agent";

interface CreativePreviewProps {
  creative: Creative;
  className?: string;
}

export function CreativePreview({ creative, className }: CreativePreviewProps) {
  const [from, to] = creative.gradient;
  return (
    <div
      className={`relative flex aspect-square w-full flex-col justify-end overflow-hidden rounded-lg p-4 text-white ${className ?? ""}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <div className="relative space-y-2">
        <p className="text-sm font-semibold leading-snug drop-shadow-sm line-clamp-3">{creative.headline}</p>
        <p className="text-[11px] leading-snug text-white/85 line-clamp-2">{creative.body}</p>
        <span className="mt-1 inline-block rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black">
          {creative.cta}
        </span>
      </div>
    </div>
  );
}
