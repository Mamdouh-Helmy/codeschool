// lib/rate-limit.js
import LRUCache from 'lru-cache';

class RateLimiter {
  constructor({ interval = 60000, uniqueTokenPerInterval = 500 }) {
    this.tokenCache = new LRUCache({
      max: uniqueTokenPerInterval,
      ttl: interval
    });
  }

  check(limit, token) {
    const tokenCount = this.tokenCache.get(token) || [0];
    if (tokenCount[0] === 0) {
      this.tokenCache.set(token, tokenCount);
    }
    tokenCount[0] += 1;

    const currentUsage = tokenCount[0];
    const isRateLimited = currentUsage >= limit;
    
    return {
      isRateLimited,
      limit,
      remaining: isRateLimited ? 0 : limit - currentUsage,
      reset: this.tokenCache.getRemainingTTL(token)
    };
  }
}

// إنشاء مثيل RateLimiter
let rateLimiterInstance;

export function rateLimit(options = {}) {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(options);
  }

  return {
    check: (limit, token) => {
      const result = rateLimiterInstance.check(limit, token);
      if (result.isRateLimited) {
        throw new Error('Rate limit exceeded');
      }
      return result;
    }
  };
}