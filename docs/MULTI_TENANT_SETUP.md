# Multi-Tenant Setup (PoC)

## Overview

This is a proof-of-concept implementation for multi-tenant functionality where publishers can host
the CMS on their own domains with filtered content.

## How It Works

### 1. Publisher Detection

The app detects if it's running on a publisher's domain by checking the hostname. It supports:

- **Subdomains**: `customorg.cms.itqan.dev` → Maps subdomain to publisher
- **Custom domains**: `customorg.store.com` → Maps full domain to publisher
- **Main app**: `cms.itqan.dev` or `localhost` → Full CMS access

### 2. Publisher Configuration

Currently configured publishers (in `publisherhost.util.ts`):

```typescript
const publisherMap: Record<string, number> = {
  // Subdomain examples (works with any parent domain)
  customorg: 1,
  publisher1: 1,
  publisher2: 2,

  // Full domain examples (add actual publisher domains)
  // 'customorg.store.com': 1,
  // 'publisher.example.com': 2,
};
```

The detection logic:

1. Checks if hostname is a main CMS domain → Full access
2. Checks if full hostname matches a publisher → Publisher access
3. Checks if subdomain matches a publisher → Publisher access
4. Otherwise → Full access (default)

### 3. Features for Publisher Hosts

#### Filtered Content

- Assets are automatically filtered by publisher ID
- Only assets belonging to the publisher are shown

#### Restricted Navigation

- Hidden links:
  - Content Standards
  - API Documentation
  - Publishers pages
- Publisher hosts can only access:
  - Gallery (assets listing)
  - Asset details
  - License details

#### Custom Branding

- Publisher hosts see a mock logo instead of the Itqan logo
- The logo is a simple SVG placeholder (can be replaced with actual publisher logos)

### 4. Route Protection

A route guard (`publisherHostGuard`) prevents publisher hosts from accessing:

- `/publishers` - Publishers listing
- `/publisher/:id` - Publisher details
- `/content-standards` - Content standards page

## Testing Locally

### Option 1: Using /etc/hosts (Recommended)

1. Edit your hosts file:
   - Windows: `C:\Windows\System32\drivers\etc\hosts`
   - Mac/Linux: `/etc/hosts`

2. Add these lines:

   ```
   127.0.0.1 customorg.localhost
   127.0.0.1 publisher.test
   ```

3. Run the app: `npm start`

4. Test:
   - Visit `http://localhost:4200` → Full CMS access
   - Visit `http://customorg.localhost:4200` → Publisher view (subdomain pattern, filtered by
     publisher ID 1)
   - Visit `http://publisher.test:4200` → Add full domain mapping in publisherMap first

### Option 2: Modify publisherhost.util.ts temporarily

For quick testing, you can temporarily modify the hostname check:

```typescript
// Change this line in publisherhost.util.ts
const hostname = window.location.hostname;

// To force publisher mode:
const hostname = 'customorg.localhost';
```

## Implementation Details

### Files Modified

1. `publisherhost.util.ts` - Added publisher ID mapping and helper functions
2. `assets.service.ts` - Added publisher filter parameter
3. `assets-listing.component.ts` - Auto-filter by publisher ID
4. `nav-links.ts` - Hide restricted links for publisher hosts
5. `header.component.ts` - Show custom logo for publisher hosts
6. `app.routes.ts` - Added route guards
7. `publisher-host.guard.ts` - New guard to restrict routes

### API Integration

The assets API endpoint is called with an additional `publisher` parameter when on a publisher host:

```
GET /assets/?publisher=1
```

## Future Enhancements

For a production-ready implementation, consider:

1. Load publisher configuration from an API/database
2. Support custom logos per publisher (from database/CDN)
3. Custom theming (colors, fonts) per publisher
4. Publisher-specific translations
5. Custom domain configuration
6. Analytics per publisher
7. Publisher dashboard with statistics
