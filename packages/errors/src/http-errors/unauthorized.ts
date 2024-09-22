import { HttpError } from './http.error';

export class UnauthorizedException extends HttpError {
  status = 401;
  message = 'Unauthorized';
}
