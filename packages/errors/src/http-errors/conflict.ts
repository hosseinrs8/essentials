import { HttpError } from './http.error';

export class ConflictException extends HttpError {
  status = 409;
  message = 'Conflict';

  constructor(public payload: any = {}) {
    super();
  }
}
