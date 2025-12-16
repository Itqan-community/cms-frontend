const hostname = window.location.hostname;

// Map domains/subdomains to publisher IDs (for PoC)
// This can map full domains, subdomains, or patterns
const publisherMap: Record<string, number> = {
  // Subdomain examples
  customorg: 1,
  publisher1: 1,
  publisher2: 2,

  // Full domain examples (add actual publisher domains here)
  // 'customorg.store.com': 1,
  // 'publisher.example.com': 2,
};

// Main CMS domains that should NOT be treated as publisher hosts
const mainDomains = ['cms.itqan.dev', 'localhost'];

export function getPublisher(): string | null {
  // Check if it's a main CMS domain
  if (mainDomains.includes(hostname)) return null;

  // First, check if the full hostname is mapped
  if (publisherMap[hostname]) return hostname;

  // Then check if the first subdomain is mapped (for subdomain-based publishers)
  const sub = hostname.split('.')[0];
  if (publisherMap[sub]) return sub;

  // Not a recognized publisher host
  return null;
}

export function getPublisherId(): number | null {
  const publisher = getPublisher();
  return publisher ? publisherMap[publisher] : null;
}

export function isPublisherHost(): boolean {
  return getPublisher() !== null;
}
