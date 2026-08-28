import { useMemo, useState } from 'react';
import type { SearchEntry } from '@/types/property';
import { sampleSearchIndex } from '@/data/sampleProperty';

/**
 * Local search over the sample dataset.
 * Supports searching by Parcel ID, Building ID, Floor ID, ULPIN code, floor name, and keywords.
 */
export function usePropertySearch() {
  const [query, setQuery] = useState('');

  const results = useMemo<SearchEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];

    return sampleSearchIndex.filter((entry) => {
      const matchLabel = entry.displayLabel.toLowerCase().includes(q);
      const matchId = entry.id.toLowerCase().includes(q);
      const matchParcel = entry.parcelId.toLowerCase().includes(q);
      const matchBuilding = entry.buildingId ? entry.buildingId.toLowerCase().includes(q) : false;
      const matchFloor = entry.floorId ? entry.floorId.toLowerCase().includes(q) : false;
      const matchUlpin = entry.ulpin ? entry.ulpin.toLowerCase().includes(q) : false;
      const matchSecondary = entry.secondaryLabel.toLowerCase().includes(q);

      return (
        matchLabel ||
        matchId ||
        matchParcel ||
        matchBuilding ||
        matchFloor ||
        matchUlpin ||
        matchSecondary
      );
    });
  }, [query]);

  return { query, setQuery, results };
}
