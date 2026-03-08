import React from "react";

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  className?: string;
}

export const TagChip: React.FC<TagChipProps> = ({ label, onRemove, className }) => {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100 ${className ?? ""}`}>
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-slate-500 transition hover:bg-slate-300 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
        >
          ×
        </button>
      )}
    </span>
  );
};

