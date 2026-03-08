import { useQuery } from '@tanstack/react-query';

interface Country {
  id: string;
  name: string;
  code?: string;
  createdAt: string;
}

interface CountriesResponse {
  countries: Country[];
}

/**
 * Fetches countries from the API.
 * TODO: Wire to real API endpoint when country CRUD is implemented (Phase 2).
 */
function fetchCountries(): Promise<CountriesResponse> {
  // Placeholder: return empty list until API is implemented
  return Promise.resolve({ countries: [] });
}

export function useCountries() {
  return useQuery<CountriesResponse>({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });
}
