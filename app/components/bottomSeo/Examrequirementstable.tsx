// app/components/ExamRequirementsTable.tsx
// Server Component — pure data transform, no interactivity, no "use client".

import { Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocSpec {
  width?: string | number | null;
  height?: string | number | null;
  min?: number | string | null;
  max?: number | string | null;
  type?: string;
}

interface CondObj {
  _order?: string[];
  [key: string]: DocSpec | string[] | undefined;
}

export interface ExamConditions {
  cond?: [CondObj, ...unknown[]];
}

// re-export for convenience
export type { CondObj };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const splitText = (t = "") =>
  t.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

const fmtSize = (
  min?: number | string | null,
  max?: number | string | null,
) => {
  const toKB = (v: number | string) => Math.round(Number(v) * 1000);
  if (!min && !max) return "—";
  if (min && max) return `${toKB(min)} KB – ${toKB(max)} KB`;
  if (max) return `up to ${toKB(max)} KB`;
  return `from ${toKB(min!)} KB`;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  examName: string;
  examConditions: ExamConditions | CondObj | null;
}

export default function ExamRequirementsTable({
  examName,
  examConditions,
}: Props) {
  const yr = new Date().getFullYear();

  if (!examConditions) return null;

  // Handle both shapes: { cond: [CondObj] } or CondObj directly
  const condObj: CondObj =
    "cond" in examConditions &&
    Array.isArray((examConditions as ExamConditions).cond)
      ? ((examConditions as ExamConditions).cond![0] as CondObj)
      : (examConditions as CondObj);

  const order: string[] = Array.isArray(condObj._order)
    ? condObj._order
    : Object.keys(condObj).filter((k) => k !== "_order");

  const documents = order
    .map((key) => {
      const s = condObj[key] as DocSpec | undefined;
      if (!s || typeof s !== "object" || Array.isArray(s)) return null;

      const dimW = s.width != null && s.width !== "" ? String(s.width) : null;
      const dimH =
        s.height != null && s.height !== "" ? String(s.height) : null;
      const dim =
        dimW && dimH ? `${dimW} × ${dimH}` : (dimW ?? dimH ?? "Not specified");

      return {
        key,
        label: splitText(key),
        size: fmtSize(s.min, s.max),
        format: (s.type ?? "JPG").toUpperCase().replace("JPEG", "JPG / JPEG"),
        dimensions: dim,
      };
    })
    .filter(Boolean) as {
    key: string;
    label: string;
    size: string;
    format: string;
    dimensions: string;
  }[];

  if (!documents.length) return null;

  // JSON-LD — rendered server-side, no dangerouslySetInnerHTML needed in RSC
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to resize photo and signature for ${examName}`,
    step: documents.map((doc, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Prepare ${doc.label}`,
      text: `Upload a ${doc.format} file. Required size: ${doc.size}. Dimensions: ${doc.dimensions}.`,
    })),
  };

  return (
    <section
      aria-labelledby={`req-heading-${examName}`}
      style={{ margin: "40px 0" }}
    >
      {/* JSON-LD injected as a script tag — safe in RSC */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#eff6ff",
            border: "1.5px solid #bfdbfe",
            borderRadius: 99,
            padding: "5px 14px",
            marginBottom: 12,
          }}
        >
          <Info size={13} color="#2563eb" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#2563eb",
              letterSpacing: 1,
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            Official Requirements
          </span>
        </div>
        <h2
          id={`req-heading-${examName}`}
          style={{
            fontFamily: "Georgia,'Times New Roman',serif",
            fontSize: "clamp(20px,4vw,26px)",
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 6px",
            lineHeight: 1.2,
          }}
        >
          {examName} Photo &amp; Document Requirements {yr}
        </h2>
        <p
          style={{
            fontFamily: "sans-serif",
            fontSize: 13,
            color: "#6b7280",
            margin: 0,
          }}
        >
          Official upload specifications for the {examName} application form
        </p>
      </div>

      <div
        style={{
          border: "1.5px solid #e5e7eb",
          borderRadius: 14,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        <div
          style={{
            padding: "11px 16px",
            background: "#f9fafb",
            borderBottom: "1.5px solid #f3f4f6",
          }}
        >
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "#6b7280",
              margin: 0,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {examName} Quick Reference Table {yr}
          </p>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "sans-serif",
              fontSize: 12,
            }}
          >
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Document", "File Size", "Format", "Dimensions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#6b7280",
                      fontSize: 11,
                      letterSpacing: 0.4,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                      borderBottom: "1.5px solid #f3f4f6",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, idx) => (
                <tr
                  key={doc.key}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    borderBottom:
                      idx < documents.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontWeight: 700, color: "#111827" }}>
                      {doc.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#15803d",
                        background: "#f0fdf4",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    >
                      {doc.size}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "#eff6ff",
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                      }}
                    >
                      {doc.format}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#374151",
                      fontWeight: 600,
                    }}
                  >
                    {doc.dimensions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
