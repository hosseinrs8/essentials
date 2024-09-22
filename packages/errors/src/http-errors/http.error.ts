export class HttpError extends Error {
  public status: number;
  public message: string;
  public payload: any;
  public headers: Record<string, string> = {};

  get statusText() {
    return this.status.toString() + ' ' + this.message;
  }

  get payloadText() {
    return JSON.stringify({
      error: this.message,
      statusCode: this.status,
      message: this.payload,
    });
  }
}
