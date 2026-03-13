"use client";
import { useState, useRef } from "react";
import { API, useIdentity } from "../vcAtoms";

// ── Cloudinary config (set these in your .env.local) ──────────────────────────
const CLOUD_NAME ="dkwqt080s" /*  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME! */;
const UPLOAD_PRESET = "studentcommunity";/* process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET! */; // unsigned preset

// Max file size: 4 MB — keeps free-tier Cloudinary bandwidth low
const MAX_BYTES = 4 * 1024 * 1024;
// Resize before upload so we never send huge images to Cloudinary
const MAX_DIM = 1200;

/** Resize image client-side before upload — reduces Cloudinary bandwidth */
async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas failed"))),
        "image/webp",
        0.82,
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Upload directly to Cloudinary using an unsigned upload preset.
 * Your server is never touched by image bytes — only the resulting URL
 * is sent with the post payload.
 *
 * For production with signed uploads, call /api/void/sign-upload to get
 * { signature, timestamp, apiKey } then add them to formData.
 */
async function uploadToCloudinary(file: File): Promise<string> {
  const blob = await resizeImage(file);
  const fd = new FormData();
  fd.append("file", blob, "image.webp");
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder", "upload");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd },
  );
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  // Return the optimized auto-quality URL
  return data.secure_url.replace("/upload/", "/upload/q_auto,f_auto/");
}

// ── ImagePicker sub-component ─────────────────────────────────────────────────
function ImagePicker({
  onUploaded,
  onError,
}: {
  onUploaded: (url: string) => void;
  onError: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      onError("Image must be under 4 MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      onError("Please select an image file");
      return;
    }

    // Show local preview immediately (good UX)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    setProgress(0);

    // Fake incremental progress while uploading
    const interval = setInterval(
      () => setProgress((p) => Math.min(p + 12, 88)),
      120,
    );

    try {
      const url = await uploadToCloudinary(file);
      clearInterval(interval);
      setProgress(100);
      URL.revokeObjectURL(localUrl);
      setPreview(url);
      console.log(url);
      onUploaded(url);
    } catch (err) {
      clearInterval(interval);
      setPreview(null);
      setProgress(0);
      onError("Upload failed — try again");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (ref.current) ref.current.value = "";
    }
  }

  function remove() {
    setPreview(null);
    setProgress(0);
    onUploaded(""); // clear from parent
  }

  return (
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
        IMAGE{" "}
        <span style={{ fontWeight: 400, textTransform: "none" }}>
          (optional · max 4 MB)
        </span>
      </div>

      {preview ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={preview}
            alt="preview"
            style={{
              maxHeight: 160,
              maxWidth: "100%",
              borderRadius: 12,
              border: "1.5px solid #e2e2ef",
              objectFit: "cover",
              display: "block",
            }}
          />
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 12,
                background: "#00000055",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 4,
                  borderRadius: 99,
                  background: "#ffffff40",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "white",
                    borderRadius: 99,
                    transition: "width 0.15s",
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>
                {progress}%
              </span>
            </div>
          )}
          {!uploading && (
            <button
              onClick={remove}
              title="Remove image"
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#dc2626",
                border: "2px solid white",
                color: "white",
                fontSize: 13,
                lineHeight: 1,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1.5px dashed #c4c4d8",
            cursor: "pointer",
            fontSize: 13,
            color: "#6b6b8a",
            background: "#f4f4f8",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "#673de6")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.borderColor = "#c4c4d8")
          }
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="3"
              width="14"
              height="10"
              rx="2"
              stroke="#673de6"
              strokeWidth="1.4"
            />
            <circle cx="5.5" cy="6.5" r="1" fill="#673de6" />
            <path
              d="M1 10.5L4.5 7.5L7 10L10 7L15 11"
              stroke="#673de6"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Add image
          <input
            ref={ref}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={pick}
          />
        </label>
      )}
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
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

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
          isPrivate,
          imageUrl: imageUrl || null,
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
      {/* Header */}
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

      {/* Body */}
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

        {/* Image upload — direct to Cloudinary, zero server bytes */}
        <ImagePicker
          onUploaded={(url) => setImageUrl(url)}
          onError={(msg) => toast(msg, true)}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {isPrivate ? "Private" : "Public"}
            </span>

            <div
              onClick={() => setIsPrivate(!isPrivate)}
              style={{
                width: 48,
                height: 26,
                borderRadius: 26,
                background: isPrivate ? "#2f80ed" : "#cfcfcf",
                position: "relative",
                cursor: "pointer",
                transition: "background 0.25s ease",
                display: "flex",
                alignItems: "center",
                padding: 3,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#fff",
                  transform: isPrivate ? "translateX(22px)" : "translateX(0px)",
                  transition: "transform 0.25s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                }}
              />
            </div>
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
