import { APIGatewayProxyResult } from "aws-lambda";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export interface ErrorBody {
  error: string,
  message: string,
};

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

export function success(body: unknown): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(body),
  }
}

export function error(errorCode: ErrorCode): APIGatewayProxyResult {
  const error = errors[errorCode];
  return {
    statusCode: error.status,
    headers: HEADERS,
    body: JSON.stringify({
      errorCode,
      message: error.message,
    }),
  };
}