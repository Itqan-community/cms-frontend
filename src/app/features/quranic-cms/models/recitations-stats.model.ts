export interface RecitationsStats {
  riwayas: number;
  reciters: number;
  recitations: number;
  /**
   * Indicates that the values are coming from a mocked response
   * rather than the live API.
   */
  isMock?: boolean;
}

