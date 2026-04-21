export interface MixpanelSegmentationResponse {
  data: {
    series: string[];
    values: Record<string, Record<string, number>>;
  };
  computed_at?: string;
}

export interface PublisherFilterItem {
  id: number;
  name: string;
}

export interface PublisherFilterResponse {
  results: PublisherFilterItem[];
  count: number;
}
