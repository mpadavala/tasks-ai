import React from "react";

interface TagChipProps {
  label: string;
  onRemove?: () => void;
}

export const TagChip: React.FC<TagChipProps> = ({ label, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100">
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          ×
        </button>
      )}
    </span>
  );
};

