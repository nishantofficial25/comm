"use client";

import { useState, useEffect } from "react";
import { X, AlertCircle, Loader } from "lucide-react";

// Server Action
import { submitRequest } from "@/lib/actions";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function RequestExamModal({ isOpen, onClose }: Props) {
  const [examName, setExamName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null,
  );

  useEffect(() => {
    if (isOpen) {
      setExamName("");
      setMessage("");
      setSubmitStatus(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!examName.trim()) {
      alert("Please enter an exam name");
      return;
    }
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("examName", examName.trim());
      fd.set("message", message.trim());
      const ok = await submitRequest(fd);
      setSubmitStatus(ok ? "success" : "error");
      if (ok) setTimeout(onClose, 2000);
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-white pr-8">Request an Exam</h2>
          <p className="text-white/90 text-sm mt-1">
            Can't find your exam? Let us know!
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Exam Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g., SSC CGL 2026"
              disabled={isSubmitting || submitStatus === "success"}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Additional Message{" "}
              <span className="text-gray-400 text-xs">(Optional)</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional details..."
              rows={4}
              disabled={isSubmitting || submitStatus === "success"}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none transition-colors resize-none text-sm"
            />
          </div>

          {submitStatus === "success" && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-sm font-medium text-green-700">
                ✓ Thank you! Your request has been submitted.
              </span>
            </div>
          )}
          {submitStatus === "error" && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-medium text-red-700">
                Failed to submit. Please try again.
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || submitStatus === "success"}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : submitStatus === "success" ? (
                "Submitted!"
              ) : (
                "Submit Request"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
