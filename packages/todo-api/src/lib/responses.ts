import { JsonLambdaError } from "lambda-decorator";

const errors = {
  missing_parameter: {
    message: "Missing parameter detected",
    status: 400,
  },
  list_exists: {
    message: "This list already exists",
    status: 400,
  },
  list_not_found: {
    message: "This list couldn't be found",
    status: 404,
  },
  database_unreachable: {
    message: "Couldn't reach the database",
    status: 424,
  },
  invalid_parameter: {
    message: "A parameter has an invalid value",
    status: 400,
  },
}

export type ErrorCode = keyof typeof errors;
export const ErrorCode: { [key in ErrorCode]: key } = Object.keys(errors).reduce((acc, curr) => ({...acc, [curr]: curr}), {}) as { [key in ErrorCode]: key };


export class MyLambdaError extends JsonLambdaError {
  constructor(code: ErrorCode) {
    super(errors[code].status, {
      errorCode: code,
      message: errors[code].message,
    });
  }
}