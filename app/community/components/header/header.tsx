"use client";
export default function Header({ activeSlug,isChat,onBack, accentColor, community, toggleJoin, setMenuOpen, menuRef, setShowGroupDetails, setShowLeaderboard, toast, setShowLeaveConfirm,menuOpen }: { activeSlug: string; accentColor: string; community: any; toggleJoin: () => void; setMenuOpen: (open: boolean) => void; menuRef: React.RefObject<HTMLDivElement>; setShowGroupDetails: (show: boolean) => void; setShowLeaderboard: (show: boolean) => void; toast: any; setShowLeaveConfirm: (show: boolean) => void }  ) {
  return (
    <div
              key={`hdr-${activeSlug}`}
              style={{
                background: isChat
                  ? `linear-gradient(135deg, ${accentColor}dd, ${accentColor}aa)`
                  : "white",
                animation: "vccdfade 0.2s ease both",
                padding: "0 14px",
                height: 58,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
                zIndex: 50,
                boxShadow: isChat ? `0 2px 20px ${accentColor}44` : "0 1px 0 #eee",
                transition: "background 0.3s, box-shadow 0.3s",
              }}
            >
              <button
                onClick={onBack}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 4px 6px 0",
                  display: "flex",
                  color: isChat ? "white" : accentColor,
                  flexShrink: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19 12H5M5 12l7-7M5 12l7 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
    
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: isChat ? "rgba(255,255,255,0.2)" : accentColor + "18",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                  border: isChat
                    ? "1.5px solid rgba(255,255,255,0.3)"
                    : `1.5px solid ${accentColor}30`,
                }}
              >
                {community.emoji}
              </div>
    
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: isChat ? "white" : "#1a1a2e",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {community.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: isChat ? "rgba(255,255,255,0.7)" : "#a0a0bc",
                    marginTop: 1,
                  }}
                >
                  {isChat
                    ? `${community.memberCount.toLocaleString()} members`
                    : `${community.memberCount.toLocaleString()} members · ${community.postCount} posts`}
                </div>
              </div>
    
              {!community.isMember && (
                <button
                  onClick={toggleJoin}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 99,
                    background: isChat ? "rgba(255,255,255,0.2)" : accentColor,
                    color: "white",
                    border: isChat ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  Join
                </button>
              )}
    
              <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 6,
                    display: "flex",
                    color: isChat ? "rgba(255,255,255,0.85)" : "#6b6b8a",
                    borderRadius: 8,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
    
                {menuOpen && (
                  <div
                    className="vc-cd-menu"
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      background: "white",
                      borderRadius: 18,
                      minWidth: 210,
                      boxShadow:
                        "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)",
                      zIndex: 200,
                      overflow: "hidden",
                      border: "1px solid #f0f0f6",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 16px 10px",
                        borderBottom: "1px solid #f4f4f8",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 10,
                          background: accentColor + "18",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 15,
                        }}
                      >
                        {community.emoji}
                      </div>
                      <div
                        style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}
                      >
                        {community.name}
                      </div>
                    </div>
                    {[
                      {
                        icon: "ℹ️",
                        label: "Group details",
                        action: () => {
                          setShowGroupDetails(true);
                          setMenuOpen(false);
                        },
                      },
                      {
                        icon: "🔔",
                        label: "Mute notifications",
                        action: () => {
                          toast.show("Muted");
                          setMenuOpen(false);
                        },
                      },
                      ...(community.isMember
                        ? [
                            {
                              icon: "🏆",
                              label: "Leaderboard",
                              action: () => {
                                setShowLeaderboard(true);
                                setMenuOpen(false);
                              },
                            },
                          ]
                        : []),
                      {
                        icon: "🔗",
                        label: "Copy link",
                        action: () => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/community?c=${activeSlug}`,
                          );
                          toast.show("Copied ✓");
                          setMenuOpen(false);
                        },
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        style={{
                          width: "100%",
                          padding: "11px 16px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 13,
                          color: "#1a1a2e",
                          fontWeight: 500,
                          textAlign: "left",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "#f9f8ff")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "none")
                        }
                      >
                        <span
                          style={{ fontSize: 16, width: 22, textAlign: "center" }}
                        >
                          {item.icon}
                        </span>
                        {item.label}
                      </button>
                    ))}
                    {community.isMember && (
                      <>
                        <div
                          style={{
                            height: 1,
                            background: "#f4f4f8",
                            margin: "2px 12px",
                          }}
                        />
                        <button
                          onClick={() => {
                            setShowLeaveConfirm(true);
                            setMenuOpen(false);
                          }}
                          style={{
                            width: "100%",
                            padding: "11px 16px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                            color: "#e53e3e",
                            fontWeight: 600,
                            textAlign: "left",
                          }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                              "#fff5f5")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                              "none")
                          }
                        >
                          <span
                            style={{ fontSize: 16, width: 22, textAlign: "center" }}
                          >
                            🚪
                          </span>
                          Leave group
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
  );
}