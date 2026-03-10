// components/ProgressBar.tsx
interface Props {
  percent: number;
  message: string;
}

export default function ProgressBar({ percent, message }: Props) {
  return (
    <div className="w-full mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-600 truncate pr-2">
          {message}
        </span>
        <span className="text-xs font-bold text-green-600 shrink-0">
          {percent}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
