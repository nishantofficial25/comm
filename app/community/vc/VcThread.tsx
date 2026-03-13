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
  image: any;
  imageUrl?: string | null;
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
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

  // Top-level comment submit
  async function postTopLevelReply() {
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
          parentReplyId: null,
          parentAnonName: null,
        }),
      });
      const d = await r.json();
      if (d.reply) {
        setReplies((p) => [...p, d.reply]);
        setPost((p) => (p ? { ...p, replyCount: p.replyCount + 1 } : p));
        setReplyTxt("");
        toast.show("Comment posted ✓");
      } else toast.show(d.error || "Failed", true);
    } catch {
      toast.show("Failed", true);
    } finally {
      setSending(false);
    }
  }

  // Inline reply submit — called from ReplyThread with text included
  async function handleInlineReply(
    parentId: string,
    parentName: string,
    text: string,
  ) {
    const r = await fetch(`${API}/api/void/posts/${slug}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: text,
        browserId: bid,
        anonName: myName,
        parentReplyId: parentId,
        parentAnonName: parentName,
      }),
    });
    const d = await r.json();
    if (d.reply) {
      setReplies((p) => [...p, d.reply]);
      setPost((p) => (p ? { ...p, replyCount: p.replyCount + 1 } : p));
      toast.show("Reply posted ✓");
    } else {
      toast.show(d.error || "Failed", true);
      throw new Error(d.error || "Failed");
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
    const r = await fetch(`${API}/api/void/posts/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId: bid }),
    });
    if (r.ok) onBack();
    else {
      toast.show("Could not delete", true);
      setDeleteConfirm(false);
    }
  }

  if (loading)
    return (
      <div className="pt-4 space-y-3">
        <SkelCard tall />
        <SkelCard />
      </div>
    );

  if (!post)
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-[#ebe8fc] flex items-center justify-center text-4xl mb-5">
          🔍
        </div>
        <h2 className="text-xl font-black text-[#1a1a2e] mb-2">
          Post not found
        </h2>
        <p className="text-sm text-[#a0a0bc] mb-6">
          This post may have been deleted.
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-[#673de6] text-white text-sm font-bold rounded-xl border-none cursor-pointer hover:bg-[#5a32cc] transition-colors shadow-[0_4px_14px_rgba(103,61,230,0.3)]"
        >
          ← Back to feed
        </button>
      </div>
    );

  const imgUrl = post.imageUrl || post.image || null;

  return (
    <div
      className="vc-fadein pb-8"
      style={{ padding: "0", maxWidth: 700, margin: "0 auto" }}
    >
      {/* ── Delete modal ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-5"
          onClick={() => setDeleteConfirm(false)}
        >
          <div className="absolute inset-0 bg-[rgba(10,8,30,0.5)] backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-[22px] w-[min(400px,92vw)] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 bg-gradient-to-r from-red-600 to-red-400" />
            <div className="p-7">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
              <p className="text-[17px] font-black text-[#1a1a2e] mb-2">
                Delete this post?
              </p>
              <p className="text-[13px] text-[#6b6b8a] leading-relaxed mb-6">
                This is permanent. The post and all its replies will be removed
                and cannot be recovered.
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-[13px] text-[13px] font-bold bg-[#f4f4f8] border border-[#e2e2ef] text-[#6b6b8a] cursor-pointer hover:border-[#673de6] hover:text-[#673de6] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={del}
                  className="flex-1 py-2.5 rounded-[13px] text-[13px] font-bold bg-gradient-to-br from-red-600 to-red-400 text-white border-none cursor-pointer shadow-[0_4px_14px_rgba(220,38,38,0.3)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.4)] hover:scale-[1.02] transition-all"
                >
                  Yes, delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Post card ── */}
      <div className="bg-white rounded-2xl border border-[#e2e2ef] shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden mb-3">
        <div className="p-5">
          {/* Author row */}
          <div className="flex items-start gap-3 mb-4">
            <Av
              size={38}
              id={post.browserId || ""}
              picture={picture && isOwner ? picture : undefined}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-[#1a1a2e]">
                  {post.anonName}
                </span>
                {isOwner && <Badge color="amber">YOU</Badge>}
                <span className="text-[11px] text-[#a0a0bc]">
                  · {ago(post.createdAt)}
                </span>
                {post.community && (
                  <button
                    onClick={() => onOpenCommunity(post.community!)}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full border-none cursor-pointer hover:opacity-75 transition-opacity"
                    style={{
                      background: (post.communityColor || "#673de6") + "18",
                      color: post.communityColor || "#673de6",
                    }}
                  >
                    {post.communityEmoji || "🌐"}{" "}
                    {post.communityName || post.community}
                  </button>
                )}
              </div>
              {!imgUrl && (
                <span className="inline-block mt-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ebe8fc] text-[#673de6] uppercase tracking-wide">
                  {post.category}
                </span>
              )}
            </div>
          </div>

          {/* Edit mode */}
          {editing ? (
            <div className="space-y-2.5 mb-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                placeholder="Post title"
                className="w-full bg-[#f4f4f8] border-[1.5px] border-[#e2e2ef] rounded-xl px-4 py-2.5 text-[15px] font-bold text-[#1a1a2e] outline-none transition-colors focus:border-[#673de6] placeholder:text-[#c4c4d8]"
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={4}
                placeholder="Details (optional)"
                className="w-full bg-[#f4f4f8] border-[1.5px] border-[#e2e2ef] rounded-xl px-4 py-2.5 text-[13px] text-[#1a1a2e] outline-none resize-y transition-colors focus:border-[#673de6] placeholder:text-[#c4c4d8]"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEdit}
                  className="px-5 py-2 bg-[#673de6] text-white text-[13px] font-bold rounded-xl border-none cursor-pointer hover:bg-[#5a32cc] transition-colors shadow-[0_2px_8px_rgba(103,61,230,0.3)]"
                >
                  Save changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2 border border-[#e2e2ef] text-[#6b6b8a] text-[13px] rounded-xl bg-transparent cursor-pointer hover:border-[#673de6] hover:text-[#673de6] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[21px] font-black text-[#1a1a2e] leading-snug mb-3">
                {post.title}
              </h1>
              {/* Hero image */}
              {imgUrl && (
                <div className="relative w-full bg-[#0d0d14] mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-auto max-h-[560px] object-contain block"
                    style={{ borderRadius: "20px" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-b from-transparent to-[rgba(10,8,30,0.6)] pointer-events-none" />
                </div>
              )}
              {post.body && (
                <p className="text-[14px] text-[#6b6b8a] leading-[1.75] mb-4 whitespace-pre-wrap">
                  {post.body} Lorem, ipsum dolor sit amet consectetur
                  adipisicing elit. Eaque aperiam cumque amet consequatur aut
                  expedita? Itaque numquam nam porro vel repudiandae beatae?
                  Quidem reiciendis obcaecati voluptates ut perspiciatis dolores
                  cum laborum ea omnis fugit sint architecto eos officiis
                  officia enim, qui facilis. Maiores, illum asperiores! Expedita
                  assumenda dicta sed iusto.
                </p>
              )}
            </>
          )}

          {post.tags.length > 0 && !editing && (
            <div className="flex gap-1.5 flex-wrap">
              {post.tags.map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-t border-[#f0f0f8] bg-[#fafafe] flex-wrap">
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
              <div className="flex-1" />
              <ActBtn
                onClick={() => {
                  setEditTitle(post.title);
                  setEditBody(post.body);
                  setEditing(true);
                }}
                icon={<EditIco />}
                label="Edit"
              />
              <ActBtn
                onClick={() => setDeleteConfirm(true)}
                icon={<TrashIco />}
                label="Delete"
                danger
              />
            </>
          )}
        </div>
      </div>

      {/* ── Top-level comment composer ── */}
      <div className="bg-white rounded-2xl border border-[#e2e2ef] shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden mb-3">
        <textarea
          ref={replyRef}
          value={replyTxt}
          onChange={(e) => setReplyTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) postTopLevelReply();
          }}
          placeholder="Share your thoughts…"
          rows={3}
          className="w-full bg-transparent border-none px-5 py-3 text-[13px] resize-none min-h-[80px] outline-none text-[#1a1a2e] block placeholder:text-[#c4c4d8]"
        />
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-[#f4f4f8]">
          <span className="text-[11px] text-[#d4d4e8] hidden sm:block select-none">
            Ctrl + Enter to post
          </span>
          <button
            onClick={postTopLevelReply}
            disabled={sending}
            className="ml-auto px-5 py-1.5 rounded-xl text-[13px] font-bold text-white border-none transition-all"
            style={{
              background: sending
                ? "#c4c4d8"
                : "linear-gradient(135deg,#673de6,#4f46e5)",
              cursor: sending ? "not-allowed" : "pointer",
              boxShadow: sending ? "none" : "0 4px 14px rgba(103,61,230,0.35)",
            }}
          >
            {sending ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>

      {/* ── Comments section ── */}
      <div className="bg-white rounded-2xl border border-[#e2e2ef] shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f0f0f8] bg-[#fafafe]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M12 1H2a1 1 0 00-1 1v7a1 1 0 001 1h2l2 3 2-3h4a1 1 0 001-1V2a1 1 0 00-1-1z"
              stroke="#a0a0bc"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[11px] font-extrabold text-[#a0a0bc] uppercase tracking-widest">
            {replies.length} {replies.length === 1 ? "Comment" : "Comments"}
          </span>
        </div>

        {replies.length === 0 ? (
          <div className="flex flex-col items-center py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#f4f4f8] flex items-center justify-center text-2xl mb-3">
              💬
            </div>
            <p className="text-[14px] font-bold text-[#1a1a2e] mb-1">
              No comments yet
            </p>
            <p className="text-[12px] text-[#a0a0bc]">
              Be the first to share your thoughts 👋
            </p>
          </div>
        ) : (
          <div className="px-5 py-2 divide-y divide-[#f6f6fb]">
            {nestedReplies.map((r, i) => (
              <ReplyThread
                key={r._id}
                reply={r}
                post={post}
                bid={bid}
                depth={0}
                myName={myName}
                onVote={voteReply}
                onReply={handleInlineReply}
                animDelay={i * 0.04}
              />
            ))}
          </div>
        )}
      </div>

      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}

// ── ReplyThread ───────────────────────────────────────────────────────────────
function ReplyThread({
  reply: r,
  post,
  bid,
  myName,
  depth,
  onVote,
  onReply,
  animDelay,
}: {
  reply: Reply;
  post: Post;
  bid: string;
  myName: string;
  depth: number;
  onVote: (id: string) => void;
  onReply: (
    parentId: string,
    parentName: string,
    text: string,
  ) => Promise<void>;
  animDelay?: number;
}) {
  const isAuthor =
    !!post.browserId && !!r.browserId && r.browserId === post.browserId;
  const isMe = !!bid && r.browserId === bid && !isAuthor;
  const [collapsed, setCollapsed] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasKids = (r.children || []).length > 0;

  function openReplyBox() {
    setShowReplyBox((v) => !v);
    setReplyText("");
    setTimeout(() => textareaRef.current?.focus(), 60);
  }

  async function submitReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReply(r._id, r.anonName, replyText.trim());
      setReplyText("");
      setShowReplyBox(false);
    } catch {
      // error toast handled by parent
    } finally {
      setSending(false);
    }
  }

  const hasChildren = (r.children || []).length > 0;
  const showLine = (hasChildren || showReplyBox) && !collapsed;

  return (
    <div
      style={{
        animation:
          animDelay !== undefined
            ? `vcFadeUp 0.3s ease ${animDelay}s both`
            : undefined,
      }}
    >
      <div className="flex gap-3 pt-3">
        {/* Left column: avatar on top, then the line as a border runs the full remaining height */}
        <div
          className="flex flex-col items-center shrink-0"
          style={{ width: 28 }}
        >
          {/* Avatar */}
          <button
            onClick={() => setCollapsed((x) => !x)}
            className="bg-transparent border-none cursor-pointer p-0 shrink-0 group"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ebe8fc] to-[#ddd5fa] flex items-center justify-center text-xs shadow-sm group-hover:from-[#673de6] group-hover:to-[#4f46e5] group-hover:text-white transition-all duration-200">
              👤
            </div>
          </button>

          {/* Line: a simple div that grows to fill ALL remaining height of the left column */}
          {showLine && (
            <div
              onClick={() => setCollapsed(true)}
              className="cursor-pointer mt-1 hover:opacity-100 transition-opacity"
              style={{
                width: 2,
                flexGrow: 1,
                background: "#d8d4f0",
                borderRadius: 99,
                minHeight: 20,
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#673de6")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "#d8d4f0")
              }
            />
          )}
        </div>

        {/* Right column: content + nested children */}
        <div className="flex-1 min-w-0">
          {/* Meta row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5 pt-0.5">
            <span className="text-[12px] font-bold text-[#1a1a2e]">
              {r.anonName}
            </span>
            {isAuthor && <Badge color="purple">OP</Badge>}
            {isMe && <Badge color="amber">YOU</Badge>}
            <span className="text-[10px] text-[#c4c4d8]">
              {ago(r.createdAt)}
            </span>
          </div>

          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="text-[11px] text-[#a0a0bc] bg-[#f4f4f8] border border-[#e2e2ef] px-2.5 py-1 rounded-lg cursor-pointer italic font-medium hover:border-[#673de6] hover:text-[#673de6] transition-colors mb-3"
            >
              [{(r.children || []).length + 1} hidden] · expand
            </button>
          ) : (
            <>
              {r.parentReplyId && r.parentAnonName && (
                <div className="text-[11px] text-[#673de6] font-semibold mb-1.5 opacity-70">
                  ↳ @{r.parentAnonName}
                </div>
              )}

              <p className="text-[13px] text-[#4a4a6a] leading-relaxed mb-2 whitespace-pre-wrap">
                {r.body}
              </p>

              {/* Vote + Reply */}
              <div className="flex items-center gap-0.5 mb-1">
                <VoteRow
                  voted={r.voted}
                  count={r.votes}
                  onVote={() => onVote(r._id)}
                  small
                />
                <button
                  onClick={openReplyBox}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border-none cursor-pointer transition-colors ${
                    showReplyBox
                      ? "bg-[#ebe8fc] text-[#673de6]"
                      : "bg-transparent text-[#a0a0bc] hover:bg-[#ebe8fc] hover:text-[#673de6]"
                  }`}
                >
                  ↩ Reply
                </button>
              </div>

              {/* ── Inline reply box ── */}
              {showReplyBox && (
                <div className="mt-2 mb-2 bg-[#f9f8ff] border border-[#e4dff8] rounded-2xl overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.ctrlKey) submitReply();
                    }}
                    placeholder={`Reply to @${r.anonName}…`}
                    rows={2}
                    className="w-full bg-transparent border-none px-3.5 py-2.5 text-[13px] text-[#1a1a2e] outline-none resize-none block placeholder:text-[#c4c4d8]"
                  />
                  <div className="flex items-center justify-between px-3.5 py-2 border-t border-[#ede9ff]">
                    <span className="text-[10px] text-[#d4d4e8] hidden sm:block select-none">
                      Ctrl+Enter to post
                    </span>
                    <div className="flex gap-2 ml-auto">
                      <button
                        onClick={() => {
                          setShowReplyBox(false);
                          setReplyText("");
                        }}
                        className="px-3 py-1 text-[12px] text-[#a0a0bc] bg-white border border-[#e2e2ef] rounded-lg cursor-pointer hover:border-[#673de6] hover:text-[#673de6] transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitReply}
                        disabled={sending || !replyText.trim()}
                        className="px-4 py-1 text-[12px] font-bold text-white rounded-lg border-none transition-all"
                        style={{
                          background:
                            sending || !replyText.trim()
                              ? "#c4c4d8"
                              : "linear-gradient(135deg,#673de6,#4f46e5)",
                          cursor:
                            sending || !replyText.trim()
                              ? "not-allowed"
                              : "pointer",
                          boxShadow:
                            sending || !replyText.trim()
                              ? "none"
                              : "0 2px 8px rgba(103,61,230,0.35)",
                        }}
                      >
                        {sending ? "Posting…" : "Post reply"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Nested children (indented, line continues through them) ── */}
              {!collapsed &&
                depth < 5 &&
                (r.children || []).map((child) => (
                  <ReplyThread
                    key={child._id}
                    reply={child}
                    post={post}
                    bid={bid}
                    myName={myName}
                    depth={depth + 1}
                    onVote={onVote}
                    onReply={onReply}
                  />
                ))}
            </>
          )}

          <div className="pb-3" />
        </div>
      </div>
    </div>
  );
}
