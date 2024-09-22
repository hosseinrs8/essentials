import { HttpError } from './http.error';

export class ForbiddenException extends HttpError {
  status = 403;
  message = 'Forbidden';
}
