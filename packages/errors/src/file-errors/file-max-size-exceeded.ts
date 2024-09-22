import { BadRequestException } from '../http-errors';

export class FileMaxSizeExceeded extends BadRequestException {
  constructor() {
    super(`file max size exceeded`);
  }
}
