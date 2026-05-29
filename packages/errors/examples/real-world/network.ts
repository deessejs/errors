/**
 * Real-world Network Error Example
 *
 * Demonstrates error handling in a network request context.
 */

import { error, is, raise } from '../../src/index.js';

// ============================================================================
// Network Error Types
// ============================================================================

const NetworkError = error<{ url: string }>({
  name: 'NetworkError',
  message: 'Network request failed for {url}',
});

const ConnectionError = error<{ host: string; port: number }>({
  name: 'ConnectionError',
  message: 'Cannot connect to {host}:{port}',
});

const TimeoutError = error<{ timeout: number }>({
  name: 'TimeoutError',
  message: 'Request timed out after {timeout}ms',
});

const HTTPError = error<{ status: number; url: string }>({
  name: 'HTTPError',
  message: 'HTTP {status} response from {url}',
});

// ============================================================================
// Simulate Network Requests
// ============================================================================

async function fetchUser(userId: string): Promise<unknown> {
  // Simulate network call
  const url = `/api/users/${userId}`;

  try {
    // Simulate timeout
    throw TimeoutError({ timeout: 5000 });
  } catch (err) {
    // Wrap in connection error
    ConnectionError({ host: 'api.example.com', port: 443 }).from(err);
  }
}

// ============================================================================
// Error Handler
// ============================================================================

function handleNetworkError(err: unknown): string {
  if (is(err, HTTPError)) {
    const httpErr = err as { fields: { status: number } };
    if (httpErr.fields.status === 404) {
      return 'User not found';
    }
    if (httpErr.fields.status >= 500) {
      return 'Server error';
    }
    return 'HTTP error';
  }

  if (is(err, TimeoutError)) {
    return 'Request timed out';
  }

  if (is(err, ConnectionError)) {
    return 'Connection failed';
  }

  if (is(err, NetworkError)) {
    return 'Network error';
  }

  return 'Unknown error';
}

// ============================================================================
// Usage
// ============================================================================

console.log('=== Network Error Handling ===');
console.log();

// Simulate catching a network error
try {
  raise(TimeoutError({ timeout: 3000 }));
} catch (err) {
  console.log('Error name:', err.name);
  console.log('Error message:', err.message);
  console.log('Handled as:', handleNetworkError(err));
  console.log();

  // Wrap it in a higher-level error
  const wrapped = NetworkError({ url: '/api/users/123' });
  wrapped.from(err);

  console.log('Wrapped error:');
  console.log('  Parent name:', wrapped.name);
  console.log('  Cause chain:', (wrapped as { causes: unknown[] }).causes.length, 'error(s)');
}

console.log();
console.log('✅ Real-world network error example completed!');
