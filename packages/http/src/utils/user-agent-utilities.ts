import { UnauthorizedException } from '@essentials/errors';
import { HttpRequest } from '../main';

export function getUserAgent(req: HttpRequest) {
  const ua = req.getHeader('user-agent').slice(0, 1024);
  if (!ua || !ua.length) {
    throw new UnauthorizedException('emptyUserAgent');
  }
  return ua;
}
