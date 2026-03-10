"use client";
import { useState, useEffect } from "react";
import {
  API,
  useIdentity,
  useToast,
  Av,
  Badge,
  Toast,
  SkelCard,
  Empty,
} from "./vcAtoms";
import { PostCard } from "./VcFeed";

interface Props {
  onOpen: (s: string) => void;
  onOpenCommunity: (s: string) => void;
}

export default function VcMyPosts({ onOpen, onOpenCommunity }: Props) {
  const { bid, myName, picture } = useIdentity();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    if (!bid) {
      setLoading(false);
      return;
    }
    fetch(
      `${API}/api/void/posts?sort=new&limit=100&browserId=${encodeURIComponent(bid)}`,
    )
      .then((r) => r.json())
      .then((d) =>
        setPosts((d.posts || []).filter((p: any) => p.browserId === bid)),
      )
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [bid]);

  async function del(slug: string) {
    if (!confirm("Delete?")) return;
    try {
      const r = await fetch(`${API}/api/void/posts/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserId: bid }),
      });
      if (r.ok) {
        setPosts((p) => p.filter((x) => x.slug !== slug));
        toast.show("Deleted");
      } else toast.show("Could not delete", true);
    } catch {
      toast.show("Error", true);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          background: "white",
          border: "1px solid #e2e2ef",
          borderRadius: 18,
          padding: 16,
          boxShadow: "0 1px 4px #00000006",
        }}
      >
        <Av size={40} id={bid} picture={picture} />
        <div>
          <div style={{ fontWeight: 700, color: "#1a1a2e" }}>{myName}</div>
          <div style={{ fontSize: 12, color: "#a0a0bc" }}>
            {posts.length} posts · your identity
          </div>
        </div>
      </div>
      {loading ? (
        [0, 1, 2].map((i) => <SkelCard key={i} />)
      ) : posts.length === 0 ? (
        <Empty
          icon="✍️"
          title="No posts yet"
          sub="Head back to the feed and start a discussion!"
        />
      ) : (
        posts.map((p, i) => (
          <PostCard
            key={p._id}
            post={p}
            delay={i * 0.04}
            isOwner={true}
            onOpen={() => onOpen(p.slug)}
            onVote={() => {}}
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
      {toast.on && <Toast msg={toast.msg} err={toast.err} />}
    </div>
  );
}
