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

  replaceInBody(template: string, value: string) {
    this.body.replace(template, value);
    return this;
  }
}

export class JsonLambdaError extends LambdaError {
  constructor(statusCode: number, body: unknown) {
    super(statusCode, typeof body === "string" ? { message: body } : body);
  }
}

export type LambdaErrorInherit = { new(statusCode: number, body: unknown, message?: null): LambdaError };