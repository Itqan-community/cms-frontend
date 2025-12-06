# Token Refresh Implementation Documentation

## Overview

This document describes the implementation of automatic token refresh and global 401/403 error
handling in the CMS Frontend application.

## Features Implemented

### 1. Automatic Token Refresh

- **Endpoint**: `/auth/token/refresh`
- **Request Body**: `{ refresh: string }`
- **Response**: `{ access: string, refresh: string }`

### 2. Global Error Handling

- Handles 401 (Unauthorized) and 403 (Forbidden) HTTP errors globally
- Automatically attempts to refresh the access token
- Retries the original failed request with the new token
- Logs out the user if token refresh fails

### 3. Race Condition Prevention

- Prevents multiple simultaneous token refresh requests
- Queues failed requests while token refresh is in progress
- All queued requests are retried once the token is refreshed

## Architecture

### Modified Files

#### 1. `src/app/core/auth/services/auth.service.ts`

**Changes**:

- Updated `refreshToken()` method to store both access and refresh tokens
- Added `setRefreshToken()` private method for updating the refresh token in localStorage

**Key Methods**:

```typescript
refreshToken(): Observable<RefreshTokenResponse> {
  // Calls /auth/token/refresh/ endpoint
  // Updates both access_token and refresh_token in localStorage
  // Logs out user if refresh fails
}
```

#### 2. `src/app/core/interceptors/auth-error.interceptor.ts` (New File)

**Purpose**: Global HTTP error interceptor for handling authentication errors

**Key Features**:

- Intercepts all HTTP responses
- Catches 401 and 403 errors
- Implements token refresh logic with queue management
- Prevents multiple simultaneous refresh attempts
- Automatic logout on refresh failure

**Implementation Details**:

```typescript
// State management
let isRefreshing = false; // Prevents multiple simultaneous refreshes
const refreshTokenSubject = new BehaviorSubject<string | null>(null); // Queues requests

// Main interceptor function
export function authErrorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>>;
```

**Error Handling Flow**:

1. Request fails with 401/403
2. Check if token refresh is already in progress
3. If not refreshing:
   - Start refresh process
   - Update tokens on success
   - Retry original request
4. If already refreshing:
   - Queue the request
   - Wait for refresh to complete
   - Retry with new token
5. If refresh fails:
   - Clear auth data
   - Redirect to login page

#### 3. `src/app/app.config.ts`

**Changes**:

- Imported `authErrorInterceptor`
- Registered interceptor in the HTTP client configuration

**Interceptor Order** (Important):

```typescript
provideHttpClient(
  withInterceptors([
    headersInterceptor, // Adds Authorization header
    authErrorInterceptor, // Handles 401/403 errors
  ])
);
```

## Token Storage

### LocalStorage Keys

- `access_token` - JWT access token
- `refresh_token` - JWT refresh token
- `user` - User object (JSON string)

### Token Flow

1. **Login**: Stores both access and refresh tokens
2. **API Request**: Adds access token to Authorization header
3. **Token Expired (401/403)**: Automatically refreshes tokens
4. **Refresh Success**: Updates both tokens and retries request
5. **Refresh Failure**: Clears storage and redirects to login

## Best Practices Implemented

### 1. **Single Refresh Attempt**

- Uses a flag (`isRefreshing`) to prevent multiple simultaneous refresh calls
- All concurrent 401 errors wait for the same refresh operation

### 2. **Request Queuing**

- Failed requests are queued using RxJS `BehaviorSubject`
- All queued requests are retried once refresh completes
- Uses `filter()` and `take(1)` to wait for the new token

### 3. **Graceful Degradation**

- If no refresh token exists, immediately logout
- If refresh endpoint itself fails, logout and redirect
- Skips refresh logic for the refresh endpoint to prevent infinite loops

### 4. **Clean Separation of Concerns**

- Headers interceptor: Only adds headers
- Error interceptor: Only handles errors and token refresh
- Auth service: Manages authentication state and storage

### 5. **Type Safety**

- All models are properly typed using existing interfaces
- No `any` types used
- Follows Angular best practices

### 6. **Memory Leak Prevention**

- Uses `take(1)` to automatically unsubscribe after receiving the token
- Proper cleanup of BehaviorSubject state

## Testing Scenarios

### Scenario 1: Single 401 Error

1. User makes API request
2. Token is expired → 401 error
3. Interceptor catches error
4. Refreshes token automatically
5. Retries original request with new token
6. User receives response (transparent to user)

### Scenario 2: Multiple Concurrent 401 Errors

1. User makes 3 API requests simultaneously
2. All tokens expired → 3x 401 errors
3. First 401 triggers refresh
4. Other 2 requests are queued
5. After refresh completes:
   - All 3 requests retry with new token
   - All return successfully

### Scenario 3: Refresh Token Expired

1. Access token expires → 401 error
2. Interceptor attempts refresh
3. Refresh token also expired → 401 from refresh endpoint
4. User is logged out
5. Redirected to login page

### Scenario 4: Network Error During Refresh

1. Access token expires → 401 error
2. Interceptor attempts refresh
3. Network error occurs
4. User is logged out
5. Redirected to login page

## Security Considerations

1. **Token Storage**: Tokens are stored in localStorage (consider HttpOnly cookies for production)
2. **XSS Protection**: Ensure proper Content Security Policy (CSP) headers
3. **Token Expiration**: Both tokens have expiration times managed by the backend
4. **Logout on Failure**: Any refresh failure results in immediate logout
5. **HTTPS Only**: Ensure all API calls are over HTTPS in production

## Usage

No code changes required in components! The interceptor works automatically:

```typescript
// Components just make normal HTTP calls
this.http.get('/api/protected-resource').subscribe({
  next: (data) => {
    // Automatically refreshed if needed
    console.log(data);
  },
  error: (error) => {
    // Only non-401/403 errors reach here
    console.error(error);
  },
});
```

## Configuration

All configuration is centralized in `AuthService`:

```typescript
private readonly API_BASE_URL = environment.API_BASE_URL;
private readonly TOKEN_KEY = 'access_token';
private readonly REFRESH_TOKEN_KEY = 'refresh_token';
private readonly USER_KEY = 'user';
```

## Future Enhancements

1. **Token Refresh Preemptive**: Refresh token before it expires (e.g., 5 minutes before)
2. **Retry Logic**: Add configurable retry attempts for failed requests
3. **Token in Memory**: Consider storing tokens in memory instead of localStorage
4. **Refresh Token Rotation**: Implement refresh token rotation for enhanced security
5. **Activity Tracking**: Auto-logout after period of inactivity
6. **Session Management**: Handle multiple tabs/windows

## Troubleshooting

### Issue: Infinite refresh loop

**Solution**: Ensure the refresh endpoint URL is excluded from the interceptor logic (already
implemented)

### Issue: Multiple refresh calls

**Solution**: Check that `isRefreshing` flag is properly managed (already implemented)

### Issue: Requests not retried after refresh

**Solution**: Verify `refreshTokenSubject` is properly broadcasting the new token (already
implemented)

### Issue: User not redirected after logout

**Solution**: Ensure Router is properly injected in the interceptor (already implemented)

## Conclusion

This implementation provides a robust, production-ready solution for automatic token refresh and
global error handling. It follows Angular best practices, prevents common pitfalls like race
conditions and infinite loops, and provides a seamless user experience.
