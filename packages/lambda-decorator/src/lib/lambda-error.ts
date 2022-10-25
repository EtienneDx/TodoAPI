export class LambdaError extends Error {
  statusCode: number;
  body: string;

  constructor(statusCode: number, body: unknown, message = null) {
    super(message ?? `An error ${statusCode} occured`);
    this.statusCode = statusCode;
    this.body = typeof body === "string" ? body : JSON.stringify(body);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, LambdaError.prototype);
  }
}

export class JsonLambdaError extends LambdaError {
  constructor(statusCode: number, body: string | { [key: string]: unknown }) {
    super(statusCode, typeof body === "string" ? { message: body } : body);
  }
}