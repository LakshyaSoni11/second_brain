import { useCallback, useState } from "react";
import { contentAPI } from "../api/axios";
import { useContentStore } from "../store/contentStore";
import type { Content, Pagination } from "../types";

export interface FetchParams {
  type?: string;
  tag?: string;
  q?: string;
  favorite?: boolean;
  page?: number;
  limit?: number;
  append?: boolean;
}

export const useContent = () => {
  const { content, loading, setLoading, setContent, addContent, updateItem, removeContent } =
    useContentStore();
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchAll = useCallback(
    async (params: FetchParams = {}) => {
      setLoading(true);
      try {
        const { data } = await contentAPI.getAll({
          type: params.type,
          tag: params.tag,
          q: params.q,
          favorite: params.favorite,
          page: params.page,
          limit: params.limit,
        });
        const items = data.content as Content[];
        if (params.append) {
          const existing = useContentStore.getState().content;
          const seen = new Set(existing.map((c) => c._id));
          setContent([...existing, ...items.filter((c) => !seen.has(c._id))]);
        } else {
          setContent(items);
        }
        setPagination(data.pagination ?? null);
      } catch {
        /* non-fatal — keep whatever is already loaded */
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setContent]
  );

  const add = useCallback(
    async (payload: Parameters<typeof contentAPI.add>[0]) => {
      const { data } = await contentAPI.add(payload);
      addContent(data.content as Content);
    },
    [addContent]
  );

  const update = useCallback(
    async (id: string, payload: Partial<Parameters<typeof contentAPI.add>[0]>) => {
      const { data } = await contentAPI.update(id, payload);
      updateItem(data.content as Content);
    },
    [updateItem]
  );

  const toggleFavorite = useCallback(
    async (id: string, isFavorite?: boolean) => {
      const { data } = await contentAPI.toggleFavorite(id, isFavorite);
      updateItem(data.content as Content);
    },
    [updateItem]
  );

  const remove = useCallback(
    async (id: string) => {
      await contentAPI.delete(id);
      removeContent(id);
    },
    [removeContent]
  );

  return { content, loading, pagination, fetchAll, add, update, toggleFavorite, remove };
};