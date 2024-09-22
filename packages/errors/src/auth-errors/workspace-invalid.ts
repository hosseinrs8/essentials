import { ForbiddenException } from '../http-errors';

export class InvalidWorkspaceError extends ForbiddenException {
  payload = 'NotValidWorkspace';
}
