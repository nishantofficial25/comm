"use client";

// components/blog/UPSCPromoCards.tsx
import Link from "next/link";

export default function UPSCPromoCards() {
  return (
    <>
      <style>{`
        .promo-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
        .promo-card {
          position: relative; overflow: hidden; border-radius: 10px;
          text-decoration: none; display: flex; flex-direction: column;
          justify-content: space-between; padding: 10px 12px; gap: 6px;
          transition: opacity .2s;
        }
        .promo-card:hover { opacity: .88; }
        .promo-green {
          background: linear-gradient(135deg, #052e16 0%, #14532d 100%);
          border: 1px solid rgba(74,222,128,0.25);
        }
        .promo-amber {
          background: linear-gradient(135deg, #1c0a00 0%, #431407 100%);
          border: 1px solid rgba(251,146,60,0.25);
        }
        .promo-tag {
          font-size: 9px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; padding: 2px 7px; border-radius: 999px; width: fit-content;
        }
        .tag-green { background: rgba(74,222,128,0.15); color: #4ade80; }
        .tag-amber { background: rgba(251,146,60,0.15); color: #fb923c; }
        .promo-title {
          color: #fff; font-size: 12px; font-weight: 700; line-height: 1.35;
          font-family: Georgia, serif; margin: 0; flex: 1;
        }
        .promo-em-green { color: #4ade80; font-style: italic; }
        .promo-em-amber { color: #fb923c; font-style: italic; }
        .promo-btn {
          font-size: 10px; font-weight: 700; color: #fff;
          border-radius: 6px; padding: 4px 10px; width: fit-content;
          font-family: sans-serif;
        }
        .btn-green { background: #16a34a; }
        .btn-amber { background: #c2410c; }
      `}</style>

      <div className="promo-pair">
        {/* Card 1 — Triple Signature */}
        <Link
          href="/blog/upscphoto"
          className="promo-card promo-amber"
        >
          <span className="promo-tag tag-amber">🔥 Trending Issue</span>
          <p className="promo-title">
            Photo Rejected? —{" "}
            <em className="promo-em-amber">fix 75% rule free</em>
          </p>
          <span className="promo-btn btn-amber">Fix UPSC Photo →</span>
        </Link>
        <Link
          href="/blog/upsctriplesignature"
          className="promo-card promo-green"
        >
          <span className="promo-tag tag-green">🔥 Trending Issue</span>
          <p className="promo-title">
            Triple Signature Error —{" "}
            <em className="promo-em-green">fix in 3 min</em>
          </p>
          <span className="promo-btn btn-green">Fix UPSC Signature →</span>
        </Link>

        {/* Card 2 — Photo 75% */}
      </div>
    </>
  );
}
