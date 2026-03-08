import { useQuery } from '@tanstack/react-query';

interface Category {
  id: string;
  name: string;
  createdAt: string;
}

interface CategoriesResponse {
  categories: Category[];
}

/**
 * Fetches categories from the API.
 * TODO: Wire to real API endpoint when category CRUD is implemented (Phase 2).
 */
function fetchCategories(): Promise<CategoriesResponse> {
  // Placeholder: return empty list until API is implemented
  return Promise.resolve({ categories: [] });
}

export function useCategories() {
  return useQuery<CategoriesResponse>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
}
