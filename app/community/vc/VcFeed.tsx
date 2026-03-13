"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Badge,
  TagChip,
  Toast,
  SkelCard,
  Empty,
  Modal,
  VoteRow,
  ActBtn,
  CmtIco,
  ShareIco,
  EditIco,
  TrashIco,
  ago,
} from "./vcAtoms";
import LoginGate from "../components/loginGate";
import { ComposeForm } from "../vc/addpost/page";

const PRESET_CATS = [
  "general",
  "upsc",
  "ssc",
  "gate",
  "banking",
  "state-psc",
  "railways",
  "defence",
];
const PAGE_SIZE = 15;

interface Post {
  _id: string;
  slug: string;
  title: string;
  body: string;
  category: string;
  tags: string[];
  anonName: string;
  browserId?: string;
  votes: number;
  replyCount: number;
  voted: boolean;
  createdAt: string;
  community?: string | null;
  communityName?: string;
  communityEmoji?: string;
  communityColor?: string;
  image?: string | null;
}

interface Props {
  onOpen: (s: string) => void;
  onOpenCommunity: (s: string) => void;
}

export default function VcFeed({ onOpen, onOpenCommunity }: Props) {
  const { bid, isLoggedIn, joinedCommunities } = useIdentity();
  const [tab, setTab] = useState<"hot" | "new" | "unsolved">("hot");
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [compose, setCompose] = useState(false);
  const [loginGate, setLoginGate] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCat] = useState("all");
  const [allCats, setAllCats] = useState<string[]>(PRESET_CATS);
  const toast = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pg: number, reset: boolean) => {
      reset ? setLoading(true) : setLoadingMore(true);
      try {
        const offset = (pg - 1) * PAGE_SIZE;
        const r = await fetch(
          `${API}/api/void/posts?sort=${tab}&limit=${PAGE_SIZE}&offset=${offset}&browserId=${encodeURIComponent(bid)}`,
        );
        const d = await r.json();
        const posts: Post[] = d.posts || [];
        setTotal(d.total ?? 0);
        setAllPosts((prev) => (reset ? posts : [...prev, ...posts]));
        setPage(pg);
      } catch {
        if (reset) setAllPosts([]);
      } finally {
        reset ? setLoading(false) : setLoadingMore(false);
      }
    },
    [tab, bid],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [tab, bid]); // eslint-disable-line

  useEffect(() => {
    fetch(`${API}/api/void/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.categories)
          setAllCats([
            ...new Set([...PRESET_CATS, ...d.categories]),
          ] as string[]);
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(
    () =>
      allPosts.filter((p) => {
        if (p.community) {
          if (!isLoggedIn) return false;
          if (!p.isPrivate && !joinedCommunities.includes(p.community)) return false;
        }
        if (catFilter !== "all" && p.category !== catFilter) return false;
        const q = search.toLowerCase().trim();
        return (
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.body?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }),
    [allPosts, catFilter, search, isLoggedIn, joinedCommunities],
  );

  const hasMore = allPosts.length < total;

  async function vote(slug: string) {
    try {
      const r = await fetch(`${API}/api/void/posts/${slug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      });
      if (!r.ok) {
        toast.show("Vote failed", true);
        return;
      }
      const d = await r.json();
      setAllPosts((p) =>
        p.map((x) =>
          x.slug === slug ? { ...x, votes: d.votes, voted: d.voted } : x,
        ),
      );
    } catch {
      toast.show("Error", true);
    }
  }

  async function del(slug: string) {
    try {
      const r = await fetch(`${API}/api/void/posts/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      });
      if (r.ok) {
        setAllPosts((p) => p.filter((x) => x.slug !== slug));
        setTotal((n) => n - 1);
        toast.show("Deleted ✓");
      } else toast.show("Could not delete", true);
    } catch {
      toast.show("Error", true);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div style={{ padding: "0", maxWidth: 700, margin: "0 auto" }}>
      <style>{`
        @keyframes vcSpin { to { transform: rotate(360deg); } }
        @keyframes vcFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .vc-post-card { transition: border-color 0.15s, box-shadow 0.18s, transform 0.18s; }
        .vc-post-card:hover { border-color: #673de6 !important; box-shadow: 0 6px 28px #673de622 !important; transform: translateY(-2px); }
        .vc-post-img { overflow:hidden; }
        .vc-post-img img { transition: transform 0.5s cubic-bezier(.25,.46,.45,.94); display:block; }
        .vc-post-card:hover .vc-post-img img { transform: scale(1.05); }
      `}</style>

      {loginGate && (
        <LoginGate
          reason="Sign in to post"
          onClose={() => setLoginGate(false)}
          onSuccess={() => {
            setLoginGate(false);
            setCompose(true);
          }}
        />
      )}

      {/* ── Delete confirmation popup ── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setDeleteTarget(null)}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(10,8,30,0.45)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />
          {/* Dialog */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: 22,
              width: "min(400px,90vw)",
              overflow: "hidden",
              boxShadow:
                "0 24px 80px rgba(103,61,230,0.18), 0 4px 20px rgba(0,0,0,0.12)",
              animation: "vcFadeUp 0.2s ease both",
            }}
          >
            {/* Red top accent */}
            <div
              style={{
                height: 4,
                background: "linear-gradient(90deg,#dc2626,#ef4444)",
              }}
            />
            <div style={{ padding: "28px 28px 24px" }}>
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "#fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                    stroke="#dc2626"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v6M14 11v6"
                    stroke="#dc2626"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: "#1a1a2e",
                  marginBottom: 8,
                }}
              >
                Delete this post?
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#6b6b8a",
                  lineHeight: 1.6,
                  marginBottom: 24,
                }}
              >
                This action is permanent. The post and all its replies will be
                removed and cannot be recovered.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 13,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "#f4f4f8",
                    border: "1.5px solid #e2e2ef",
                    color: "#6b6b8a",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#673de6";
                    (e.currentTarget as HTMLElement).style.color = "#673de6";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#e2e2ef";
                    (e.currentTarget as HTMLElement).style.color = "#6b6b8a";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => del(deleteTarget)}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 13,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "linear-gradient(135deg,#dc2626,#ef4444)",
                    border: "none",
                    color: "white",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px #dc262630",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "scale(1.02)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 6px 20px #dc262645";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "scale(1)";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 4px 14px #dc262630";
                  }}
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoggedIn && (
        <div
          style={{
            background: "linear-gradient(135deg,#673de608,#4f46e508)",
            border: "1px solid #673de620",
            borderRadius: 14,
            padding: "11px 16px",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b6b8a", flex: 1 }}>
            Viewing public posts ·{" "}
            <strong style={{ color: "#673de6" }}>sign in</strong> to see
            community posts
          </span>
          <button
            onClick={() => setLoginGate(true)}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              background: "#673de6",
              border: "none",
              color: "white",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span
          onClick={() => (isLoggedIn ? setCompose(true) : setLoginGate(true))}
          style={{
            width: 40,
            height: "inherit",
            borderRadius: 14,
            background: "linear-gradient(135deg,#673de6,#4f46e5)",
            border: "none",
            color: "white",
            fontSize: 22,
            fontWeight: 900,
            cursor: "pointer",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </span>
        <div
          style={{
            display: "flex",
            borderRadius: 14,
            padding: 4,
            gap: 2,
            background: "white",
            border: "1px solid #e2e2ef",
            flexShrink: 0,
          }}
        >
          {(["hot", "new", "unsolved"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                background: tab === t ? "#673de6" : "transparent",
                color: tab === t ? "white" : "#6b6b8a",
              }}
            >
              {t === "hot" ? "🔥 Hot" : t === "new" ? "✨ New" : "💬 Unsolved"}
            </button>
          ))}
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
          style={{
            borderRadius: 12,
            padding: "7px 10px",
            fontSize: 12,
            outline: "none",
            background: "white",
            border: "1px solid #e2e2ef",
            color: "#6b6b8a",
            cursor: "pointer",
            maxWidth: 130,
          }}
        >
          <option value="all">All categories</option>
          {allCats.map((c) => (
            <option key={c} value={c}>
              {c.toUpperCase()}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 11, color: "#a0a0bc", marginLeft: "auto" }}>
          {filtered.length} posts
        </span>
      </div>

      {compose && (
        <Modal onClose={() => setCompose(false)}>
          <ComposeForm
            onCancel={() => setCompose(false)}
            onSuccess={(p) => {
              setAllPosts((prev) => [p, ...prev]);
              setTotal((n) => n + 1);
              setCompose(false);
              toast.show("Posted ✓");
            }}
            toast={toast.show}
          />
        </Modal>
      )}

      {loading ? (
        [0, 1, 2, 3].map((i) => <SkelCard key={i} />)
      ) : filtered.length === 0 ? (
        <Empty
          icon={search ? "🔍" : "💬"}
          title={search ? `No results for "${search}"` : "Nothing here yet"}
          sub={
            search
              ? "Try different keywords."
              : isLoggedIn
                ? "Be the first to post!"
                : "Sign in and join communities to see more"
          }
        />
      ) : (
        filtered.map((p, i) => (
          <PostCard
            key={p._id}
            post={p}
            delay={i * 0.02}
            isOwner={p.browserId === bid}
            onOpen={() => onOpen(p.slug)}
            onVote={() => vote(p.slug)}
            onDelete={() => setDeleteTarget(p.slug)}
            onShare={() =>
              navigator.clipboard
                .writeText(`${window.location.origin}/community?post=${p.slug}`)
                .then(() => toast.show("Copied ✓"))
            }
            onOpenCommunity={onOpenCommunity}
          />
        ))
      )}

      {!loading && hasMore && (
        <div style={{ textAlign: "center", marginTop: 20, marginBottom: 8 }}>
          <button
            onClick={() => fetchPage(page + 1, false)}
            disabled={loadingMore}
            style={{
              padding: "11px 36px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: 700,
              cursor: loadingMore ? "wait" : "pointer",
              background: "white",
              border: "1.5px solid #e2e2ef",
              color: "#673de6",
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!loadingMore) {
                (e.currentTarget as HTMLElement).style.borderColor = "#673de6";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 0 0 3px #673de615";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#e2e2ef";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            {loadingMore ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    border: "2px solid #e2e2ef",
                    borderTopColor: "#673de6",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "vcSpin 0.7s linear infinite",
                  }}
                />
                Loading…
              </>
            ) : (
              <>Load more · {total - allPosts.length} remaining</>
            )}
          </button>
        </div>
      )}

      {!loading && !hasMore && allPosts.length > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0 8px",
            fontSize: 11,
            color: "#a0a0bc",
          }}
        >
          · all {allPosts.length} posts loaded ·
        </div>
      )}

      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({
  post,
  delay,
  isOwner,
  onOpen,
  onVote,
  onDelete,
  onShare,
  onOpenCommunity,
}: {
  post: Post;
  delay: number;
  isOwner: boolean;
  onOpen: () => void;
  onVote: () => void;
  onDelete: () => void;
  onShare: () => void;
  onOpenCommunity: (s: string) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const hasImage = !!post.image && !imgErr;

  // Use the image URL directly — no transformation to avoid breaking the URL
  const thumbUrl = post.image || null;

  return (
    <div
      className="vc-post-card"
      onClick={onOpen}
      style={{
        background: "white",
        border: "1px solid #e2e2ef",
        borderRadius: 18,
        marginBottom: 10,
        cursor: "pointer",
        boxShadow: "0 1px 4px #00000008",
        animation: `vcFadeUp 0.32s ease ${delay}s both`,
        overflow: "hidden",
      }}
    >
      {/* ── Hero image — full natural height, no crop ── */}
      {hasImage && thumbUrl && (
        <div
          className="vc-post-img"
          style={{ position: "relative", width: "100%", background: "#0d0d14" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl!}
            alt={post.title}
            loading="lazy"
            onError={() => setImgErr(true)}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 600,
              objectFit: "contain",
              display: "block",
            }}
          />

          {/* Subtle bottom gradient for badge readability */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 56,
              background:
                "linear-gradient(to bottom, transparent, rgba(10,8,30,0.55))",
              pointerEvents: "none",
            }}
          />

          {/* Category pill — bottom left */}
          <span
            style={{
              position: "absolute",
              bottom: 10,
              left: 12,
              fontSize: 10,
              fontWeight: 800,
              padding: "3px 10px",
              borderRadius: 99,
              background: "#673de6",
              color: "white",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              boxShadow: "0 2px 10px #673de650",
            }}
          >
            {post.category}
          </span>
        </div>
      )}

      {/* ── Card body ── */}
      <div style={{ padding: hasImage ? "12px 16px 0" : "14px 16px 0" }}>
        {/* Author row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <Av size={28} id={post.browserId || ""} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>
                {post.anonName}
              </span>
              {isOwner && <Badge color="amber">YOU</Badge>}
              <span style={{ fontSize: 11, color: "#a0a0bc" }}>
                · {ago(post.createdAt)}
              </span>
              {post.community && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCommunity(post.community!);
                  }}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 99,
                    background: (post.communityColor || "#673de6") + "15",
                    color: post.communityColor || "#673de6",
                    border: `1px solid ${post.communityColor || "#673de6"}25`,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {post.communityEmoji || "🌐"}{" "}
                  {post.communityName || post.community}
                </button>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {/* Category badge only shown here when no image (otherwise overlaid on image) */}
            {!hasImage && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "#ebe8fc",
                  color: "#673de6",
                  textTransform: "uppercase",
                }}
              >
                {post.category}
              </span>
            )}
            {isOwner && (
              <div
                style={{ position: "relative" }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setMenu((m) => !m)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "none",
                    border: "none",
                    color: "#a0a0bc",
                    cursor: "pointer",
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ⋯
                </button>
                {menu && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 6px)",
                      background: "white",
                      border: "1px solid #e2e2ef",
                      borderRadius: 14,
                      overflow: "hidden",
                      zIndex: 40,
                      minWidth: 140,
                      boxShadow: "0 8px 32px #00000018",
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenu(false);
                        onOpen();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: 13,
                        color: "#1a1a2e",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <EditIco /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setMenu(false);
                        onDelete();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        padding: "10px 16px",
                        fontSize: 13,
                        color: "#dc2626",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <TrashIco /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: "#1a1a2e",
            lineHeight: 1.35,
            marginBottom: 6,
          }}
        >
          {post.title}
        </div>

        {/* Body — 1 line if image dominates, 2 lines otherwise */}
        {post.body && (
          <p
            style={{
              fontSize: 13,
              color: "#6b6b8a",
              lineHeight: 1.6,
              marginBottom: 8,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: hasImage ? 1 : 2,
              WebkitBoxOrient: "vertical" as any,
            }}
          >
            {post.body}
          </p>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            {post.tags.slice(0, 4).map((t) => (
              <TagChip key={t} tag={t} />
            ))}
          </div>
        )}
      </div>

      {/* ── Action bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "8px 12px",
          borderTop: "1px solid #f0f0f8",
          marginTop: 10,
          background: "#fafafe",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <VoteRow voted={post.voted} count={post.votes} onVote={onVote} small />
        <ActBtn
          onClick={onOpen}
          small
          icon={<CmtIco />}
          label={`${post.replyCount}`}
        />
        <ActBtn onClick={onShare} small icon={<ShareIco />} label="Share" />
      </div>
    </div>
  );
}
