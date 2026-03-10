// Use as app/loading.tsx OR app/[examSlug]/loading.tsx

export default function LoadingAnimation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-green-200 rounded-full" />
          <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-3 bg-green-500 rounded-full animate-pulse opacity-20" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-gray-800">
            Loading Exam Details
          </h3>
          <p className="text-sm text-gray-600">
            Please wait while we fetch the requirements...
          </p>
        </div>
        <div className="flex justify-center gap-1">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
