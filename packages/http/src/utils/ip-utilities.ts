import { HttpRequest, HttpResponse } from 'uWebSockets.js';

export function getIP(res: HttpResponse) {
  return res.clientIp;
}

export function isIP(value: string | null): boolean {
  if (!value) return false;
  return (
    /^(?:(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])\.){3}(?:\d|[1-9]\d|1\d{2}|2[0-4]\d|25[0-5])$/.test(
      value,
    ) ||
    /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i.test(
      value,
    )
  );
}

function getClientIpFromXForwardedFor(value?: string) {
  if (!value) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  // x-forwarded-for may return multiple IP addresses in the format:
  // "proxy 1 IP, proxy 2 IP, client IP"
  // Therefore, the right-most IP address is the IP address of the most recent proxy
  // and the left-most IP address is the IP address of the originating client.
  // source: http://docs.aws.amazon.com/elasticloadbalancing/latest/classic/x-forwarded-headers.html
  // Azure Web App's also adds a port for some reason, so we'll only use the first part (the IP)
  const forwardedIps = value.split(',').map((e) => {
    const ip = e.trim();
    if (ip.includes(':')) {
      const splitted = ip.split(':');
      // make sure we only use this if it's ipv4 (ip:port)
      if (splitted.length === 2) {
        return splitted[0];
      }
    }
    return ip;
  });

  // Sometimes IP addresses in this header can be 'unknown' (http://stackoverflow.com/a/11285650).
  // Therefore taking the right-most IP address that is not unknown
  // A Squid configuration directive can also set the value to "unknown" (http://www.squid-cache.org/Doc/config/forwarded_for/)
  for (let i = 0; i <= forwardedIps.length - 1; i += 1) {
    if (isIP(forwardedIps[i])) {
      return forwardedIps[i];
    }
  }

  // If no value in the split list is an ip, return null
  return null;
}

export function calculateRemoteIp(res: HttpResponse, req: HttpRequest) {
  let result: string | null = req.getHeader('x-client-ip');
  if (isIP(result)) {
    return result;
  }
  result = getClientIpFromXForwardedFor(req.getHeader('x-forwarded-for'));
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('cf-connecting-ip');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('fastly-client-ip');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('true-client-ip');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('x-real-ip');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('x-cluster-client-ip');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('x-forwarded');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('forwarded-for');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('forwarded');
  if (isIP(result)) {
    return result;
  }
  result = req.getHeader('x-appengine-user-ip');
  if (isIP(result)) {
    return result;
  }
  result = Buffer.from(res.getRemoteAddressAsText()).toString();
  if (isIP(result)) {
    return result;
  }
  return Buffer.from(res.getProxiedRemoteAddressAsText()).toString();
}

export function parseIP32bits(ip: string) {
  const parts = ip.split('.').map((part) => parseInt(part, 10));
  return (
    parts.reduce((acc, part, index) => acc + (part << (8 * (3 - index))), 0) >>>
    0
  );
}

export function checkIPInRange(ip: string, start: string, end: string) {
  const ipBits = parseIP32bits(ip);
  const startBits = parseIP32bits(start);
  const endBits = parseIP32bits(end);
  return ipBits >= startBits && ipBits <= endBits;
}
