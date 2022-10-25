import "reflect-metadata";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

import { LambdaError } from "./lambda-error";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

interface LambdaHandlerConfig {
  endpoint: string;
  method: "POST" | "GET" | "DELETE" | "HEAD" | "PUT" | "OPTIONS" | "TRACE" | "PATCH" | "CONNECT";
  headers?: { [key: string]: string };
}
export function lambdaHandler(config: LambdaHandlerConfig) {
  return function (target: Record<string, unknown>, propertyKey: string, descriptor: PropertyDescriptor) {

    Reflect.defineMetadata(propertyKey, {
      ...Reflect.getMetadata(propertyKey, target),
      lambdaEndpoint: config.endpoint,
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
export function jsonRequest<ConfigType extends { [key: string]: "string" | "number"}>(config: ConfigType, validationError = {
  code: 400,
  missingParameter: "Missing parameters [{{parameters}}]",
  invalidParameter: "Parameter '{{parameter}}' is not valid",
  unknownParameter: "Unknown parameter '{{parameter}}'",
}) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalHandler = descriptor.value;
    descriptor.value = async function(event: APIGatewayEvent, ...args: unknown[]): Promise<unknown> {
      const keys = Object.keys(config);
      const body = JSON.parse(event.body ?? "{}") as ConfigType;
      for (const key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          if(!keys.includes(key)) {
            throw new LambdaError(validationError.code, validationError.unknownParameter.replace("{{parameter}}", key));
          }
          else if(typeof body[key] !== config[key]) {
            throw new LambdaError(validationError.code, validationError.invalidParameter.replace("{{parameter}}", key));
          }
          else {
            keys.splice(keys.indexOf(key), 1);
          }
        }
      }
      if(keys.length > 0) {
        throw new LambdaError(validationError.code, validationError.missingParameter.replace("{{parameters}}", keys.join(", ")));
      }
      return await originalHandler(body, event, ...args)
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
export function validate(lambda: (...args: unknown[]) => boolean, error?: LambdaError) {
  return function (target: unknown, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    console.log(target, propertyKey, descriptor);
    const originalHandler = descriptor.value;
    descriptor.value = async function(...args: unknown[]): Promise<unknown> {
      if(!lambda(...args)) {
        throw error ?? new LambdaError(400, "Validation failed");
      }
      return await originalHandler(...args);
    }
  }
}