import { HttpError } from './http.error';

export class NotFoundException extends HttpError {
  status = 404;
  message = 'Not Found';
}
