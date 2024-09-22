import { HttpError } from './http.error';

export class BadRequestException extends HttpError {
  status = 400;
  message = 'Bad Request';

  constructor(public payload: any) {
    super();
  }
}
