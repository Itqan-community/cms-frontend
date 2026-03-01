export interface Reciter {
  id: number;
  name: string;
  recitations_count: number;
}

export interface ApiReciters {
  results: Reciter[];
  count: number;
}
