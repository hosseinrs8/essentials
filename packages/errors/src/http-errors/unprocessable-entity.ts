import { HttpError } from './http.error';

export class UnprocessableEntity extends HttpError {
  status = 422;
  message = 'Unprocessable Entity';

  constructor(public payload: any = {}) {
    super();
  }
}
