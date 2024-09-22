import { HttpError } from './http.error';

export class RequestTimeOut extends HttpError {
  status = 408;
  message = 'Request Timeout';
}
