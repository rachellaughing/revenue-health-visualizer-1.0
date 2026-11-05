// Shared sticky banner for illustrative preview report pages.
// One implementation, reused by every "-preview" report route so the
// "this isn't your data" treatment stays consistent across pages.
export function IllustrativeDataBanner({ note }: { note?: string }) {
  return (
    <div className="mm-preview-banner">
      <span className="text-xs font-bold tracking-[0.08em]">
        ILLUSTRATIVE DATA — this is a sample, not your data
      </span>
      {note && (
        <span className="text-xs font-normal text-[color-mix(in_srgb,var(--mm-white)_90%,transparent)]">
          {note}
        </span>
      )}
    </div>
  );
}
