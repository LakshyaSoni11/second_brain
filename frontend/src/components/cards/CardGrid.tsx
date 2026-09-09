import React from "react";
import { ContentCard, type SavePayload } from "./ContentCard";
import type { Content } from "../../types";

interface CardGridProps {
  items: Content[];
  onDelete?: (id: string) => void;
  onSave?: (id: string, payload: SavePayload) => Promise<void>;
  onToggleFavorite?: (id: string, currentValue: boolean) => void;
  onSummarized?: (item: { _id: string; summary?: string }) => void;
  readOnly?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const CardGrid: React.FC<CardGridProps> = ({
  items,
  onDelete,
  onSave,
  onToggleFavorite,
  onSummarized,
  readOnly,
  selectable,
  selectedIds,
  onToggleSelect,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <ContentCard
          key={item._id}
          item={item}
          onDelete={onDelete}
          onSave={onSave}
          onToggleFavorite={onToggleFavorite}
          onSummarized={onSummarized}
          readOnly={readOnly}
          selectable={selectable}
          selected={selectedIds?.has(item._id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
};