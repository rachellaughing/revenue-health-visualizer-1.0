// Shared sticky banner for illustrative preview report pages.
// One implementation, reused by every "-preview" report route so the
// "this isn't your data" treatment stays consistent across pages.
const T = {
  ember: "#F05223",
  white: "#FFFFFF",
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
        boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
        ILLUSTRATIVE DATA — this is a sample, not your data
      </span>
      {note && (
        <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,0.9)" }}>
          {note}
        </span>
      )}
    </div>
  );
}
