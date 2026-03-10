import { Redis } from "@upstash/redis";

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function getStats() {
  const redis = Redis.fromEnv();

  const [total, image, pdf, imagetopdf, signature] = await redis.mget<number[]>(
    "resizes:total",
    "resizes:image",
    "resizes:pdf",
    "resizes:imagetopdf",
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return todayKey(d);
  });

  const dailyCounts = await redis.mget<number[]>(
    ...days.map((d) => `resizes:date:${d}`),
  );

  return {
    total: total ?? 0,
    image: image ?? 0,
    pdf: pdf ?? 0,
    imagetopdf: imagetopdf ?? 0,
    signature: signature ?? 0,
    daily: days.map((date, i) => ({ date, count: dailyCounts[i] ?? 0 })),
  };
}

export default async function AdminPage() {
  const stats = await getStats();
  const maxDaily = Math.max(...stats.daily.map((d) => d.count), 1);

  const typeBreakdown = [
    {
      label: "Image Resizer",
      key: "image",
      color: "#f97316",
      value: stats.image,
    },
    { label: "PDF Compressor", key: "pdf", color: "#2563eb", value: stats.pdf },
    {
      label: "Image to PDF",
      key: "imagetopdf",
      color: "#16a34a",
      value: stats.imagetopdf,
    },
  ];

  return (
    <div
      className="min-h-screen bg-gray-950 text-white p-6 md:p-10"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-bold tracking-widest uppercase text-gray-500 mb-1">
            SahiPhoto.in
          </p>
          <h1 className="text-3xl font-black tracking-tight">
            Resize Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Live stats from Upstash Redis · refreshes on each page load
          </p>
        </div>

        {/* Total + breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {/* Total */}
          <div className="col-span-2 md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Total Resizes
            </p>
            <p
              className="text-5xl font-black tracking-tight"
              style={{ color: "#7c3aed" }}
            >
              {stats.total.toLocaleString("en-IN")}
            </p>
          </div>
          {/* Per type */}
          {typeBreakdown.map((t) => (
            <div
              key={t.key}
              className="bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                {t.label}
              </p>
              <p
                className="text-3xl font-black tracking-tight"
                style={{ color: t.color }}
              >
                {t.value.toLocaleString("en-IN")}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {stats.total ? Math.round((t.value / stats.total) * 100) : 0}%
                of total
              </p>
            </div>
          ))}
        </div>

        {/* Type bar chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-300 mb-5">
            Breakdown by tool
          </h2>
          <div className="space-y-3">
            {typeBreakdown.map((t) => (
              <div key={t.key} className="flex items-center gap-3">
                <div className="w-36 text-[12px] text-gray-400 shrink-0 truncate">
                  {t.label}
                </div>
                <div className="flex-1 bg-white/5 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${stats.total ? Math.round((t.value / stats.total) * 100) : 0}%`,
                      background: t.color,
                    }}
                  />
                </div>
                <div className="text-[12px] font-bold text-gray-300 w-14 text-right shrink-0">
                  {t.value.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last 7 days bar chart */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-300 mb-6">Last 7 days</h2>
          <div className="flex items-end gap-2 h-32">
            {[...stats.daily].reverse().map((d, i) => {
              const pct = maxDaily > 0 ? (d.count / maxDaily) * 100 : 0;
              const isToday = d.date === todayKey();
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5"
                >
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: isToday ? "#4ade80" : "#6b7280" }}
                  >
                    {d.count > 0 ? d.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 4)}%`,
                      background: isToday ? "#16a34a" : "#374151",
                      minHeight: 4,
                    }}
                  />
                  <span className="text-[9px] text-gray-500 truncate w-full text-center">
                    {new Date(d.date + "T00:00:00").toLocaleDateString(
                      "en-IN",
                      { weekday: "short" },
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-8">
          Data stored in Upstash Redis ·{" "}
          <a
            href="https://console.upstash.com"
            className="underline hover:text-gray-400"
          >
            Open Upstash Console
          </a>
        </p>
      </div>
    </div>
  );
}
