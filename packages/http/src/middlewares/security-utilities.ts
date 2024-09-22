import { HttpResponse } from 'uWebSockets.js';

const headers = {
  'content-security-policy': "frame-ancestors 'none';",
  'cross-origin-embedder-policy': 'require-corp',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-dns-prefetch-control': 'off',
  'expect-ct': 'max-age=0',
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=15552000; includeSubDomains',
  'x-download-options': 'noopen',
  'x-content-type-options': 'nosniff',
  'origin-agent-cluster': '?1',
  'x-permitted-cross-domain-policies': 'none',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-xss-protection': '1; mode=block',
};

export function setSecurityHeaders(res: HttpResponse) {
  for (const [key, value] of Object.entries(headers)) {
    res.writeHeader(key, value);
  }
}
