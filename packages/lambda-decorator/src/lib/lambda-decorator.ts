import "reflect-metadata";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import { LambdaError, LambdaErrorInherit } from "./lambda-error";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

interface LambdaHandlerConfig {
  endpoint?: string;
  method: "POST" | "GET" | "DELETE" | "HEAD" | "PUT" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT";
  headers?: { [key: string]: string };
}
interface ValidationError {
  missingParameter: LambdaError,
  invalidParameter: LambdaError,
  unknownParameter: LambdaError,
}


export function lambdaHandler(config: LambdaHandlerConfig) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {

    Reflect.defineMetadata(propertyKey, {
      ...Reflect.getMetadata(propertyKey, target),
      lambdaEndpoint: config.endpoint ?? propertyKey,
      lambdaMethod: config.method,
    }, target);

    const originalHandler = descriptor.value;
    descriptor.value = async function(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {
      try {
        const body = await originalHandler(event, context);
        if(typeof body !== "string") {
          throw new LambdaError(500, `Invalid body, expected type 'string' and got '${typeof body}'`);
        }
        return {
          statusCode: 200,
          headers: config.headers ?? HEADERS,
          body,
        };
      }
      catch(e: unknown) {
        if(e instanceof LambdaError) {
          return {
            statusCode: e.statusCode,
            headers: config.headers ?? HEADERS,
            body: e.body,
          }
        }
        return {
          statusCode: 500,
          headers: config.headers ?? HEADERS,
          body: "Unexpected server error"
        }
      }
    }
  }
}
function validateObject<ConfigType extends { [key: string]: string | string[]}>(
  config: ConfigType,
  object: ConfigType,
  ErrorType: LambdaErrorInherit = LambdaError,
  validationError = {
    missingParameter: new ErrorType(400, "Missing parameters [{{parameters}}]"),
    invalidParameter: new ErrorType(400, "Parameter '{{parameter}}' is not valid"),
    unknownParameter: new ErrorType(400, "Unknown parameter '{{parameter}}'"),
  },
) {
  const keys = Object.keys(config);
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      if(!keys.includes(key)) {
        throw validationError.unknownParameter.replaceInBody("{{parameter}}", key);
      }
      else if(Array.isArray(config[key]) ? (!config[key].includes(typeof object[key])) : (typeof object[key] !== config[key])) {
        throw validationError.invalidParameter.replaceInBody("{{parameter}}", key);
      }
      else {
        keys.splice(keys.indexOf(key), 1);
      }
    }
  }
  const missingKeys = keys.filter(key => !Array.isArray(config[key]) || !config[key].includes("undefined"));
  if(missingKeys.length > 0) {
    throw validationError.missingParameter.replaceInBody("{{parameters}}", missingKeys.join(", "));
  }
}
export function jsonRequest<ConfigType extends { [key: string]: string | string[]}>(config: ConfigType, validationError?: ValidationError) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalHandler = descriptor.value;
    descriptor.value = async function(event: APIGatewayEvent, ...args: unknown[]): Promise<unknown> {
      const body = JSON.parse(event.body ?? "{}") as ConfigType;
      const errorType = Reflect.getMetadata(propertyKey, target).LambdaErrorType ?? LambdaError;
      validateObject(config, body, errorType, validationError);
      return await originalHandler(body, event, ...args);
    }
  }
}
export function queryRequest<ConfigType extends { [key: string]: string | string[]}>(config: ConfigType, validationError?: ValidationError) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalHandler = descriptor.value;
    descriptor.value = async function(event: APIGatewayEvent, ...args: unknown[]): Promise<unknown> {
      const body = (event.queryStringParameters ?? {}) as ConfigType;
      const errorType = Reflect.getMetadata(propertyKey, target).LambdaErrorType ?? LambdaError;
      validateObject(config, body, errorType, validationError);
      return await originalHandler(body, event, ...args);
    }
  }
}
export function jsonResponse() {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalHandler = descriptor.value;
    descriptor.value = async function(...args: unknown[]): Promise<unknown> {
      return JSON.stringify(await originalHandler(...args));
    }
  }
}
export function validate(lambda: (...args: never[]) => boolean, error?: LambdaError) {
  return function (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalHandler = descriptor.value;
    descriptor.value = async function(...args: never[]): Promise<unknown> {
      if(!lambda(...args)) {
        throw error ?? new LambdaError(400, "Validation failed");
      }
      return await originalHandler(...args);
    }
  }
}
export function withError(ErrorType: LambdaErrorInherit) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyKey: string, _descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(propertyKey, {
      ...Reflect.getMetadata(propertyKey, target),
      LambdaErrorType: ErrorType,
    }, target);
  }
}