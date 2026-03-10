"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Badge,
  Toast,
  SkelCard,
  VoteRow,
  ActBtn,
  CmtIco,
  ShareIco,
  EditIco,
  TrashIco,
  TagChip,
  usePolling,
  ago,
} from "./vcAtoms";

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
interface Reply {
  _id: string;
  body: string;
  anonName: string;
  browserId?: string;
  createdAt: string;
  votes: number;
  voted: boolean;
  parentReplyId?: string | null;
  parentAnonName?: string | null;
  children?: Reply[];
}

function nestReplies(flat: Reply[]): Reply[] {
  const map = new Map<string, Reply>();
  const roots: Reply[] = [];
  flat.forEach((r) => map.set(r._id, { ...r, children: [] }));
  flat.forEach((r) => {
    if (r.parentReplyId && map.has(r.parentReplyId))
      map.get(r.parentReplyId)!.children!.push(map.get(r._id)!);
    else roots.push(map.get(r._id)!);
  });
  return roots;
}

interface Props {
  slug: string;
  onBack: () => void;
  onOpenCommunity: (s: string) => void;
}

export default function VcThread({ slug, onBack, onOpenCommunity }: Props) {
  const { bid, myName, picture } = useIdentity();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTxt, setReplyTxt] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const toast = useToast();
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const replyFetcher = useCallback(async () => {
    const r = await fetch(
      `${API}/api/void/posts/${slug}?browserId=${encodeURIComponent(bid)}`,
    );
    const d = await r.json();
    if (d.post) setPost(d.post);
    return (d.replies || []) as Reply[];
  }, [slug, bid]);
  const [liveReplies] = usePolling(replyFetcher, 4000, !loading);
  useEffect(() => {
    if (!loading) setReplies(liveReplies);
  }, [liveReplies, loading]);
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/void/posts/${slug}?browserId=${encodeURIComponent(bid)}`)
      .then((r) => r.json())
      .then((d) => {
        setPost(d.post || null);
        setReplies(d.replies || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, bid]);

  const isOwner = !!bid && post?.browserId === bid;
  const nestedReplies = useMemo(() => nestReplies(replies), [replies]);

  async function votePost() {
    if (!post) return;
    const r = await fetch(`${API}/api/void/posts/${slug}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: bid }),
    });
    if (!r.ok) return;
    const d = await r.json();
    setPost((p) => (p ? { ...p, votes: d.votes, voted: d.voted } : p));
  }
  async function voteReply(replyId: string) {
    const r = await fetch(
      `${API}/api/void/posts/${slug}/replies/${replyId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      },
    );
    if (!r.ok) return;
    const d = await r.json();
    setReplies((rs) =>
      rs.map((x) =>
        x._id === replyId ? { ...x, votes: d.votes, voted: d.voted } : x,
      ),
    );
  }
  async function postReply() {
    if (!replyTxt.trim()) {
      toast.show("Write something first", true);
      return;
    }
    setSending(true);
    try {
      const r = await fetch(`${API}/api/void/posts/${slug}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: replyTxt.trim(),
          browserId: bid,
          anonName: myName,
          parentReplyId: replyingTo?.id || null,
          parentAnonName: replyingTo?.name || null,
        }),
      });
      const d = await r.json();
      if (d.reply) {
        setReplies((p) => [...p, d.reply]);
        setPost((p) => (p ? { ...p, replyCount: p.replyCount + 1 } : p));
        setReplyTxt("");
        setReplyingTo(null);
        toast.show("Reply posted ✓");
      } else toast.show(d.error || "Failed", true);
    } catch {
      toast.show("Failed", true);
    } finally {
      setSending(false);
    }
  }
  async function saveEdit() {
    if (!editTitle.trim()) {
      toast.show("Title required", true);
      return;
    }
    const r = await fetch(`${API}/api/void/posts/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        body: editBody,
        browserId: bid,
      }),
    });
    if (r.ok) {
      setPost((p) => (p ? { ...p, title: editTitle, body: editBody } : p));
      setEditing(false);
      toast.show("Updated ✓");
    } else toast.show("Could not update", true);
  }
  async function del() {
    if (!confirm("Delete this post permanently?")) return;
    const r = await fetch(`${API}/api/void/posts/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: bid }),
    });
    if (r.ok) onBack();
    else toast.show("Could not delete", true);
  }

  if (loading)
    return (
      <div className="pt-4">
        <SkelCard tall />
        <SkelCard />
      </div>
    );
  if (!post)
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ color: "#6b6b8a", marginTop: 16 }}>Post not found</h2>
        <button
          onClick={onBack}
          style={{
            marginTop: 16,
            padding: "10px 24px",
            background: "#673de6",
            border: "none",
            borderRadius: 12,
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    );

  const inp = {
    background: "#f4f4f8",
    border: "1.5px solid #e2e2ef",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 13,
    outline: "none",
    color: "#1a1a2e",
    width: "100%",
    marginBottom: 10,
    transition: "border-color 0.2s",
    display: "block" as const,
  };

  return (
    <div className="vc-fadein">
      {/* Post card */}
      <div
        style={{
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          marginBottom: 8,
          overflow: "hidden",
          boxShadow: "0 1px 4px #00000006",
        }}
      >
        <div style={{ padding: "20px 20px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Av
              size={36}
              id={post.browserId || ""}
              picture={picture && isOwner ? picture : undefined}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}
                >
                  {post.anonName}
                </span>
                {isOwner && <Badge color="amber">YOU</Badge>}
                <span style={{ fontSize: 11, color: "#a0a0bc" }}>
                  · {ago(post.createdAt)}
                </span>
                {post.community && (
                  <button
                    onClick={() => onOpenCommunity(post.community!)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 99,
                      background: (post.communityColor || "#673de6") + "18",
                      color: post.communityColor || "#673de6",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {post.communityEmoji || "🌐"}{" "}
                    {post.communityName || post.community}
                  </button>
                )}
              </div>
            </div>
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
          </div>

          {editing ? (
            <div style={{ marginBottom: 16 }}>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                style={{ ...inp, fontWeight: 700, fontSize: 16 }}
                onFocus={(e) => (e.target.style.borderColor = "#673de6")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                style={{ ...inp, resize: "y" }}
                onFocus={(e) => (e.target.style.borderColor = "#673de6")}
                onBlur={(e) => (e.target.style.borderColor = "#e2e2ef")}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: "8px 20px",
                    background: "#673de6",
                    border: "none",
                    borderRadius: 10,
                    color: "white",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "8px 20px",
                    border: "1px solid #e2e2ef",
                    borderRadius: 10,
                    color: "#6b6b8a",
                    fontSize: 13,
                    background: "none",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#1a1a2e",
                  lineHeight: 1.3,
                  marginBottom: 10,
                }}
              >
                {post.title}
              </h1>
              {post.body && (
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b6b8a",
                    lineHeight: 1.7,
                    marginBottom: 12,
                  }}
                >
                  {post.body}
                </p>
              )}
            </>
          )}
          {post.tags.length > 0 && !editing && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {post.tags.map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "8px 12px",
            borderTop: "1px solid #e2e2ef",
            background: "#f4f4f8",
            flexWrap: "wrap",
          }}
        >
          <VoteRow voted={post.voted} count={post.votes} onVote={votePost} />
          <ActBtn
            onClick={() => replyRef.current?.focus()}
            icon={<CmtIco />}
            label={`${post.replyCount} Replies`}
          />
          <ActBtn
            onClick={() =>
              navigator.clipboard
                .writeText(`${window.location.origin}/community?post=${slug}`)
                .then(() => toast.show("Copied ✓"))
            }
            icon={<ShareIco />}
            label="Share"
          />
          {isOwner && !editing && (
            <>
              <div style={{ flex: 1 }} />
              <ActBtn
                onClick={() => {
                  setEditTitle(post.title);
                  setEditBody(post.body);
                  setEditing(true);
                }}
                icon={<EditIco />}
                label="Edit"
              />
              <ActBtn onClick={del} icon={<TrashIco />} label="Delete" danger />
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      <div
        style={{
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: 8,
          boxShadow: "0 1px 4px #00000006",
        }}
      >
        {replies.length > 0 && (
          <div
            style={{
              padding: "10px 20px",
              borderBottom: "1px solid #e2e2ef",
              background: "#f4f4f8",
              fontSize: 11,
              fontWeight: 800,
              color: "#a0a0bc",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {replies.length} {replies.length === 1 ? "Comment" : "Comments"}
          </div>
        )}
        {replies.length === 0 && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              fontSize: 13,
              color: "#a0a0bc",
            }}
          >
            No replies yet — be the first 👋
          </div>
        )}
        <div style={{ padding: "12px 20px" }}>
          {nestedReplies.map((r, i) => (
            <ReplyThread
              key={r._id}
              reply={r}
              post={post}
              bid={bid}
              depth={0}
              onVote={voteReply}
              onReply={(id, name) => {
                setReplyingTo({ id, name });
                setTimeout(() => replyRef.current?.focus(), 80);
              }}
              style={{ animation: `vcFadeUp 0.3s ease ${i * 0.04}s both` }}
            />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div
        style={{
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 1px 4px #00000006",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderBottom: "1px solid #e2e2ef",
            background: "#f4f4f8",
          }}
        >
          <Av size={26} id={bid} picture={picture} />
          <div style={{ fontSize: 13, color: "#6b6b8a" }}>
            {replyingTo ? (
              <>
                Replying to{" "}
                <strong style={{ color: "#673de6" }}>@{replyingTo.name}</strong>{" "}
                as <strong style={{ color: "#1a1a2e" }}>{myName}</strong>{" "}
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    fontSize: 11,
                    color: "#a0a0bc",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    marginLeft: 4,
                  }}
                >
                  ✕ cancel
                </button>
              </>
            ) : (
              <>
                Replying as{" "}
                <strong style={{ color: "#1a1a2e" }}>{myName}</strong>
              </>
            )}
          </div>
        </div>
        <textarea
          ref={replyRef}
          value={replyTxt}
          onChange={(e) => setReplyTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) postReply();
          }}
          placeholder="Share your thoughts…"
          rows={3}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            padding: "16px 20px",
            fontSize: 13,
            resize: "vertical",
            minHeight: 80,
            outline: "none",
            color: "#1a1a2e",
            display: "block",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            borderTop: "1px solid #e2e2ef",
            background: "#f4f4f8",
          }}
        >
          <span style={{ fontSize: 11, color: "#a0a0bc" }}>
            Ctrl+Enter to post
          </span>
          <button
            onClick={postReply}
            disabled={sending}
            style={{
              padding: "7px 20px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              color: "white",
              background: sending ? "#c4c4d8" : "#673de6",
              border: "none",
              cursor: sending ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

function ReplyThread({
  reply: r,
  post,
  bid,
  depth,
  onVote,
  onReply,
  style,
}: {
  reply: Reply;
  post: Post;
  bid: string;
  depth: number;
  onVote: (id: string) => void;
  onReply: (id: string, name: string) => void;
  style?: React.CSSProperties;
}) {
  const isAuthor =
    !!post.browserId && !!r.browserId && r.browserId === post.browserId;
  const isMe = !!bid && r.browserId === bid && !isAuthor;
  const [collapsed, setCollapsed] = useState(false);
  const hasKids = (r.children || []).length > 0;
  return (
    <div style={style}>
      <div style={{ display: "flex", gap: 8, padding: "10px 0" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            width: 28,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setCollapsed((x) => !x)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#ebe8fc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              👤
            </div>
          </button>
          {hasKids && !collapsed && (
            <div
              style={{
                flex: 1,
                width: 2,
                minHeight: 12,
                background: "#e2e2ef",
                borderRadius: 99,
                cursor: "pointer",
              }}
              onClick={() => setCollapsed(true)}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>
              {r.anonName}
            </span>
            {isAuthor && <Badge color="purple">OP</Badge>}
            {isMe && <Badge color="amber">YOU</Badge>}
            <span style={{ fontSize: 10, color: "#a0a0bc" }}>
              {ago(r.createdAt)}
            </span>
          </div>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              style={{
                fontSize: 12,
                color: "#a0a0bc",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontStyle: "italic",
              }}
            >
              [{(r.children || []).length + 1} collapsed] — expand
            </button>
          ) : (
            <>
              {r.parentReplyId && r.parentAnonName && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#673de6",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  ↳ @{r.parentAnonName}
                </div>
              )}
              <p
                style={{
                  fontSize: 13,
                  color: "#4a4a6a",
                  lineHeight: 1.6,
                  marginBottom: 8,
                }}
              >
                {r.body}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <VoteRow
                  voted={r.voted}
                  count={r.votes}
                  onVote={() => onVote(r._id)}
                  small
                />
                <button
                  onClick={() => onReply(r._id, r.anonName)}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 99,
                    background: "none",
                    border: "none",
                    color: "#6b6b8a",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f4f4f8")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  Reply
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {!collapsed &&
        depth < 5 &&
        (r.children || []).map((child) => (
          <div
            key={child._id}
            style={{
              marginLeft: 28,
              borderLeft: "2px solid #e2e2ef",
              paddingLeft: 8,
            }}
          >
            <ReplyThread
              reply={child}
              post={post}
              bid={bid}
              depth={depth + 1}
              onVote={onVote}
              onReply={onReply}
            />
          </div>
        ))}
    </div>
  );
}
