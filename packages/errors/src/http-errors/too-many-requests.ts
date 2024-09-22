import { HttpError } from './http.error';

export class TooManyRequests extends HttpError {
  status = 429;
  message = 'Too Many Requests';

  constructor(public readonly retrySecs: number) {
    super();
    this.headers['Retry-After'] = retrySecs.toString();
  }
}
