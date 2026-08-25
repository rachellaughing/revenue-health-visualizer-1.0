// Shared sticky banner for illustrative preview report pages.
// One implementation, reused by every "-preview" report route so the
// "this isn't your data" treatment stays consistent across pages.
const T = {
  ember: "var(--mm-ember)",
  white: "var(--mm-white)",
};

export function IllustrativeDataBanner({ note }: { note?: string }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: T.ember,
        color: T.white,
        padding: "11px 24px",
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        boxShadow: "0 2px 10px color-mix(in srgb, var(--mm-ink) 15.0%, transparent)",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
        ILLUSTRATIVE DATA — this is a sample, not your data
      </span>
      {note && (
        <span style={{ fontSize: 12, fontWeight: 400, color: "color-mix(in srgb, var(--mm-white) 90.0%, transparent)" }}>
          {note}
        </span>
      )}
    </div>
  );
}
