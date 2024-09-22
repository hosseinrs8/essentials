import { BadRequestException } from '../http-errors';

export class InvalidFileExtension extends BadRequestException {
  constructor() {
    super(`invalid file extension`);
  }
}
