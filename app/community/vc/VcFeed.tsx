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
}

interface Props {
  onOpen: (s: string) => void;
  onOpenCommunity: (s: string) => void;
}

export default function VcFeed({ onOpen, onOpenCommunity }: Props) {
  const { bid, isLoggedIn, joinedCommunities } = useIdentity();
  const [tab, setTab] = useState<"hot" | "new" | "unsolved">("hot");
  const [allPosts, setAllPosts] = useState<Post[]>([]); // accumulated pages
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

  // ── Fetch one page ────────────────────────────────────────────────────────
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

  // Reset when tab or user changes
  useEffect(() => {
    fetchPage(1, true);
  }, [tab, bid]); // eslint-disable-line

  // Load categories
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

  // ── Filter posts for display ───────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      allPosts.filter((p) => {
        // Community posts gated by login + membership
        if (p.community) {
          if (!isLoggedIn) return false;
          if (!joinedCommunities.includes(p.community)) return false;
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

  // ── Actions ───────────────────────────────────────────────────────────────
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
    if (!confirm("Delete this post?")) return;
    try {
      const r = await fetch(`${API}/api/void/posts/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      });
      if (r.ok) {
        setAllPosts((p) => p.filter((x) => x.slug !== slug));
        setTotal((n) => n - 1);
        toast.show("Deleted");
      } else toast.show("Could not delete", true);
    } catch {
      toast.show("Error", true);
    }
  }

  return (
    <div>
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

      {/* Guest banner */}
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

      {/* Search + compose */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <svg
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#a0a0bc",
              pointerEvents: "none",
            }}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <circle
              cx="6"
              cy="6"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M9.5 9.5L12.5 12.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            style={{
              width: "100%",
              borderRadius: 14,
              padding: "10px 16px 10px 36px",
              fontSize: 13,
              outline: "none",
              background: "white",
              border: "1.5px solid #e2e2ef",
              color: "#1a1a2e",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#673de6")}
            onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
          />
        </div>
        <button
          onClick={() => (isLoggedIn ? setCompose(true) : setLoginGate(true))}
          style={{
            width: 44,
            height: 44,
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
        </button>
      </div>

      {/* Tabs + category filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
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

      {/* Compose modal */}
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

      {/* Post list */}
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
            onDelete={() => del(p.slug)}
            onShare={() =>
              navigator.clipboard
                .writeText(`${window.location.origin}/community?post=${p.slug}`)
                .then(() => toast.show("Copied ✓"))
            }
            onOpenCommunity={onOpenCommunity}
          />
        ))
      )}

      {/* ── Pagination: Load more ── */}
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

      {/* End of feed indicator */}
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
      <style>{`@keyframes vcSpin { to { transform: rotate(360deg); } }`}</style>
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
  return (
    <div
      onClick={onOpen}
      style={{
        background: "white",
        border: "1px solid #e2e2ef",
        borderRadius: 18,
        marginBottom: 8,
        cursor: "pointer",
        boxShadow: "0 1px 4px #00000006",
        animation: `vcFadeUp 0.3s ease ${delay}s both`,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#673de6";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 0 0 2px #673de615";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#e2e2ef";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div style={{ padding: "14px 16px 0" }}>
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
        {post.body && (
          <p
            style={{
              fontSize: 13,
              color: "#6b6b8a",
              lineHeight: 1.6,
              marginBottom: 8,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as any,
            }}
          >
            {post.body}
          </p>
        )}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "8px 12px",
          borderTop: "1px solid #e2e2ef",
          marginTop: 10,
          borderRadius: "0 0 18px 18px",
          background: "#f4f4f8",
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

// ── ComposeForm ───────────────────────────────────────────────────────────────
export function ComposeForm({
  onCancel,
  onSuccess,
  toast,
  community,
}: {
  onCancel: () => void;
  onSuccess: (p: any) => void;
  toast: (m: string, e?: boolean) => void;
  community?: string;
}) {
  const { bid, myName } = useIdentity();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cat, setCat] = useState("general");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = {
    background: "#f4f4f8",
    border: "1.5px solid #e2e2ef",
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    color: "#1a1a2e",
    width: "100%",
    transition: "border-color 0.2s",
  };
  async function submit() {
    if (!title.trim()) {
      toast("Title required", true);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/void/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          category: cat,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          browserId: bid,
          anonName: myName,
          community: community || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        const pr = await fetch(
          `${API}/api/void/posts/${d.slug}?browserId=${encodeURIComponent(bid)}`,
        );
        const pd = await pr.json();
        if (pd.post) onSuccess(pd.post);
      } else toast(d.error || "Failed", true);
    } catch {
      toast("Network error", true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        width: "min(560px, 95vw)",
        border: "1px solid #e2e2ef",
        overflow: "hidden",
        boxShadow: "0 20px 60px #00000020",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e2e2ef",
          background: "#f4f4f8",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, color: "#1a1a2e", fontSize: 15 }}>
            Create Post
          </div>
          <div style={{ fontSize: 11, color: "#a0a0bc", marginTop: 2 }}>
            As <strong style={{ color: "#673de6" }}>{myName}</strong>
          </div>
        </div>
        <button
          onClick={onCancel}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "none",
            border: "none",
            color: "#a0a0bc",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          maxLength={120}
          placeholder="Title"
          style={{ ...inp, fontWeight: 700, fontSize: 15 }}
          onFocus={(e) => (e.target.style.borderColor = "#673de6")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Details (optional)"
          style={{
            ...inp,
            resize: "vertical" as any,
            display: "block",
            minHeight: 72,
          }}
          onFocus={(e) => (e.target.style.borderColor = "#673de6")}
          onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
        />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#a0a0bc",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              CATEGORY
            </div>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
            >
              {[
                "general",
                "upsc",
                "ssc",
                "gate",
                "banking",
                "state-psc",
                "railways",
                "defence",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#a0a0bc",
                letterSpacing: "0.1em",
                marginBottom: 6,
              }}
            >
              TAGS
            </div>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tips, notes, …"
              style={inp}
              onFocus={(e) => (e.target.style.borderColor = "#673de6")}
              onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
            />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              border: "1px solid #e2e2ef",
              padding: "9px 20px",
              borderRadius: 12,
              fontSize: 13,
              color: "#6b6b8a",
              background: "none",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{
              padding: "9px 24px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              color: "white",
              background: busy ? "#c4c4d8" : "#673de6",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
