// src/services/tags.ts
import api from "./api";

export interface Tag {
  id: string;
  userId: string;
  name: string;
  normalizedName: string;
  color: string;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TagWithUsage extends Tag {
  usageCount: number;
}

export interface CreateTagDto {
  name: string;
  color?: string;
  description?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
  description?: string;
}

export interface MergeTagsDto {
  sourceTagIds: string[];
  targetTagId: string;
}

export interface TagStats {
  tag: Tag;
  transactionCount: number;
  totalSpending: number;
}

export interface TagSpending {
  tagId: string;
  tagName: string;
  tagColor: string;
  transactionCount: number;
  totalSpent: number;
}

export interface TagTrend {
  month: string;
  expense: number;
  income: number;
  transactionCount: number;
  netFlow: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  categoryType: string;
  transactionCount: number;
  totalAmount: number;
}

export interface TagInsightsSummary {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalTags: number;
    usedTags: number;
    unusedTags: number;
    totalTransactions: number;
    totalSpent: number;
  };
  topTag: TagSpending | null;
  spendingByTag: TagSpending[];
  unusedTags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

// Tag CRUD operations
export const createTag = (data: CreateTagDto) => api.post<Tag>("/tags", data);

export const getAllTags = (includeDeleted = false) =>
  api.get<Tag[]>(`/tags?includeDeleted=${includeDeleted}`);

export const getTagsWithUsage = () =>
  api.get<TagWithUsage[]>("/tags/with-usage");

export const searchTags = (query: string) =>
  api.get<Tag[]>(`/tags/search?q=${encodeURIComponent(query)}`);

export const getTagById = (id: string) => api.get<Tag>(`/tags/${id}`);

export const getTagStats = (id: string) => api.get<TagStats>(`/tags/${id}/stats`);

export const updateTag = (id: string, data: UpdateTagDto) =>
  api.put<Tag>(`/tags/${id}`, data);

export const restoreTag = (id: string) => api.put<Tag>(`/tags/${id}/restore`);

export const deleteTag = (id: string) => api.delete(`/tags/${id}`);

export const hardDeleteTag = (id: string) => api.delete(`/tags/${id}/hard`);

export const mergeTags = (data: MergeTagsDto) =>
  api.post<Tag>("/tags/merge", data);

export const bulkDeleteTags = (tagIds: string[]) =>
  api.post("/tags/bulk-delete", { tagIds });

// Tag analytics operations
export const getSpendingByTag = (params?: {
  from?: string;
  to?: string;
  tagIds?: string[];
}) => {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);
  if (params?.tagIds && params.tagIds.length > 0) {
    queryParams.append("tagIds", params.tagIds.join(","));
  }
  return api.get<TagSpending[]>(`/tags/analytics/spending?${queryParams.toString()}`);
};

export const getTagTrends = (tagId: string, months = 6) =>
  api.get<TagTrend[]>(`/tags/analytics/trends/${tagId}?months=${months}`);

export const getCategoryBreakdownByTag = (
  tagId: string,
  params?: { from?: string; to?: string }
) => {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);
  return api.get<CategoryBreakdown[]>(
    `/tags/analytics/category-breakdown/${tagId}?${queryParams.toString()}`
  );
};

export const compareTagSpending = (
  tagIds: string[],
  params?: { from?: string; to?: string }
) => {
  const queryParams = new URLSearchParams();
  queryParams.append("tagIds", tagIds.join(","));
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);
  return api.get<TagSpending[]>(`/tags/analytics/compare?${queryParams.toString()}`);
};

export const getTagInsightsSummary = (params?: {
  from?: string;
  to?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.from) queryParams.append("from", params.from);
  if (params?.to) queryParams.append("to", params.to);
  return api.get<TagInsightsSummary>(`/tags/analytics/summary?${queryParams.toString()}`);
};
