// components/ScanTunePanel.tsx
"use client";

import { Loader, ScanLine, Settings } from "lucide-react";
import { DEFAULT_SCAN_PARAMS, ScanParams } from "@/lib/scanPipeline";

interface Props {
  params: ScanParams;
  onChange: (key: keyof ScanParams, value: number | boolean) => void;
  onRescan: () => void;
  rescanning: boolean;
}

export default function ScanTunePanel({
  params,
  onChange,
  onRescan,
  rescanning,
}: Props) {
  const slider = (
    key: keyof ScanParams,
    min: number,
    max: number,
    step: number,
    label: string,
    hint?: string,
  ) => (
    <div className="space-y-1" key={key}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
          {typeof params[key] === "number" && step < 1
            ? (params[key] as number).toFixed(2)
            : String(params[key])}
          {key === "cropPad"
            ? "px"
            : key === "threshold" || key === "inkBoost"
              ? ""
              : "×"}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={params[key] as number}
        onChange={(e) =>
          onChange(
            key,
            step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value),
          )
        }
        className="w-full h-1 accent-violet-600 cursor-pointer"
      />
      {hint && <p className="text-[9px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  );

  const toggle = (key: keyof ScanParams, label: string) => (
    <label
      className="flex items-center gap-1.5 cursor-pointer select-none"
      key={key}
    >
      <input
        type="checkbox"
        checked={params[key] as boolean}
        onChange={(e) => onChange(key, e.target.checked)}
        className="accent-violet-600 w-3 h-3 cursor-pointer"
      />
      <span
        className={`text-[10px] font-semibold ${params[key] ? "text-violet-700" : "text-gray-400"}`}
      >
        {label}
      </span>
    </label>
  );

  return (
    <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest flex items-center gap-1">
          <Settings size={10} /> Scan Settings
        </span>
        <span className="text-[9px] text-gray-400">
          Adjust then click Re-scan
        </span>
      </div>

      {slider(
        "threshold",
        30,
        150,
        1,
        "Ink Threshold",
        "↑ raise if strokes missing · ↓ lower if spots appear",
      )}
      {slider(
        "openIter",
        1,
        6,
        1,
        "Noise Removal",
        "↑ raise if background speckles remain",
      )}
      {slider(
        "closeIter",
        0,
        4,
        1,
        "Stroke Fill",
        "↑ fill gaps inside strokes",
      )}
      {slider(
        "inkBoost",
        0.3,
        1.0,
        0.05,
        "Ink Darkness",
        "↓ lower = richer darker ink colour",
      )}
      {slider(
        "cropPad",
        0,
        30,
        1,
        "Crop Padding",
        "Padding px around signature bounding box",
      )}

      <div className="flex gap-4 pt-0.5">
        {toggle("autoCrop", "Auto-crop")}
        {toggle("removeSpeckle", "Speckle removal")}
        {toggle("unsharp", "Sharpen")}
      </div>

      <button
        onClick={onRescan}
        disabled={rescanning}
        className="w-full py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
      >
        {rescanning ? (
          <>
            <Loader size={12} className="animate-spin" /> Re-scanning…
          </>
        ) : (
          <>
            <ScanLine size={12} /> Re-scan with these settings
          </>
        )}
      </button>
    </div>
  );
}
