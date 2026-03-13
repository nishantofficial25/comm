"use client";
import { useState, useEffect } from "react";
import { API, useIdentity } from "../vc/vcAtoms";

interface Community {
  _id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  memberCount: number;
  isMember: boolean;
}

interface JoinedSidebarProps {
  activeSlug: string;
  onOpen: (slug: string) => void;
}

export default function JoinedSidebar({
  activeSlug,
  onOpen,
}: JoinedSidebarProps) {
  const { bid } = useIdentity();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!bid) return;
    fetch(
      `${API}/api/void/communities?limit=100&browserId=${encodeURIComponent(bid)}`,
    )
      .then((r) => r.json())
      .then((d) =>
        setCommunities(
          (d.communities || []).filter((c: Community) => c.isMember),
        ),
      )
      .catch(() => setCommunities([]))
      .finally(() => setLoading(false));
  }, [bid]);

  const filtered = search.trim()
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      )
    : communities;

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        background: "#ffffff",
        borderRight: "1px solid #ececf4",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes jsbSkel { 0%,100%{background:#f0f0f8} 50%{background:#e6e4f8} }
        .jsb-item::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding: "12px 16px 12px",
          borderBottom: "1px solid #f0f0f8",
          flexShrink: 0,
          background: "linear-gradient(135deg, #fafafe 0%, #f4f3ff 100%)",
        }}
      >
        <a
        href="/community"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "none",
            cursor: "pointer",
            marginRight: 4,
            flexShrink: 0,
          }}
          className="mb-2"
        >
          <div
          
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(135deg,#673de6,#4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            V
          </div>
          <span
            style={{
              fontWeight: 900,
              fontSize: 15,
              color: "#1a1a2e",
              letterSpacing: "-0.3px",
            }}
            className="vc-hide-xs"
          >
            Void
          </span>
        </a>

        {/* Search bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "white",
            borderRadius: 12,
            padding: "8px 12px",
            border: "1.5px solid #e8e8f4",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocusCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#673de6";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 3px #673de620";
          }}
          onBlurCapture={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#e8e8f4";
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 1px 4px rgba(0,0,0,0.04)";
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: "#a0a0bc", flexShrink: 0 }}
          >
            <circle
              cx="11"
              cy="11"
              r="8"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            <path
              d="M21 21l-4.35-4.35"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 12.5,
              color: "#1a1a2e",
              fontFamily: "inherit",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a0a0bc",
                padding: 0,
                lineHeight: 1,
                display: "flex",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── List ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "8px 0",
          scrollbarWidth: "none",
        }}
      >
        {loading ? (
          [0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 14px",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 13,
                  background: "#f0f0f8",
                  flexShrink: 0,
                  animation: "jsbSkel 1.4s ease infinite",
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 10,
                    width: "65%",
                    borderRadius: 99,
                    background: "#f0f0f8",
                    marginBottom: 6,
                    animation: "jsbSkel 1.4s ease infinite",
                  }}
                />
                <div
                  style={{
                    height: 8,
                    width: "40%",
                    borderRadius: 99,
                    background: "#f0f0f8",
                    animation: "jsbSkel 1.4s ease infinite",
                  }}
                />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              color: "#a0a0bc",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {search ? "No results found" : "No communities joined yet"}
            </div>
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.slug === activeSlug;
            const accent = c.color || "#673de6";
            return (
              <button
                key={c._id}
                onClick={() => onOpen(c.slug)}
                title={c.name}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "9px 14px 9px 12px",
                  background: isActive ? accent + "10" : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? accent : "transparent"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "#f7f7fc";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                {/* Emoji avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    background: isActive ? accent + "20" : accent + "12",
                    border: `1.5px solid ${isActive ? accent + "50" : accent + "20"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                    transition: "all 0.15s",
                    boxShadow: isActive ? `0 4px 12px ${accent}30` : "none",
                  }}
                >
                  {c.emoji}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? accent : "#1a1a2e",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      lineHeight: 1.3,
                      transition: "color 0.15s",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: isActive ? accent + "aa" : "#a0a0bc",
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="9"
                        cy="7"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      />
                      <path
                        d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    {c.memberCount?.toLocaleString() ?? 0} members
                  </div>
                </div>

                {/* Active dot */}
                {isActive && (
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: accent,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${accent}88`,
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid #f0f0f8",
          flexShrink: 0,
          background: "#fafafd",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e88",
          }}
        />
        <span style={{ fontSize: 11, color: "#a0a0bc", fontWeight: 600 }}>
          {communities.length} joined{" "}
          {communities.length === 1 ? "community" : "communities"}
        </span>
      </div>
    </div>
  );
}
