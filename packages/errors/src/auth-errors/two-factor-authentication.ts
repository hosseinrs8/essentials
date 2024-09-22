import { ForbiddenException } from '../http-errors';

export class TwoFactorAuthenticationError extends ForbiddenException {
  payload = 'Not2FAVerified';
}
