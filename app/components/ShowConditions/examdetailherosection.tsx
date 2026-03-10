import React from 'react'
interface Props {
  selectedExam: string;
}
const HeroSection = ( {selectedExam}:Props) => {
  return (
    <>
      {selectedExam != null && (
        <section className="relative pb-6 overflow-hidden">
          <div className="space-y-3 md:space-y-4 text-center">
            <h1 className="text-3xl md:text-6xl font-extrabold tracking-tight text-gray-900">
              Resize documents for{" "}
              <span className="bg-green-600 to-purple-600 bg-clip-text text-transparent">
                {selectedExam == "custom"
                  ? "Custom Requirements"
                  : selectedExam + " 2026"}
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-gray-600">
              Resize Documents for{" "}
              {selectedExam == "custom"
                ? "custom requirements in just one click."
                : `${selectedExam} Documents for Free in just one click.`}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-5 py-2 rounded-full text-sm font-medium shadow-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Trusted by 50k+ Aspirants
              </div>

              <div className="flex items-center gap-2 bg-green-100 text-green-700 px-5 py-2 rounded-full text-sm font-medium shadow-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11c1.657 0 3-1.343 3-3V6a3 3 0 10-6 0v2c0 1.657 1.343 3 3 3z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 11h14v8H5z"
                  />
                </svg>
                Privacy Priority
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default HeroSection