const hostname = window.location.hostname;
const allowedPublishers = ['customorg'];

export function getPublisher(): string | null {
  if (hostname === 'cms.itqan.dev') return null;

  const sub = hostname.split('.')[0];

  return allowedPublishers.includes(sub) ? sub : null;
}
