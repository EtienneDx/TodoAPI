import "reflect-metadata";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

export type LambdaController = Record<string, (event: APIGatewayEvent, context: Context) => Promise<APIGatewayProxyResult>>;

export function makeHandlers(...controllerClasses: unknown[]) {
  const exports: LambdaController = {};
  for (const controller of controllerClasses as { new(): LambdaController }[]) {
    const metadataKeys = Reflect.getMetadataKeys(controller.prototype);
    const controllerInstance = new controller();
    for(const key of metadataKeys) {
      const metadata = Reflect.getMetadata(key, controller.prototype);
      if(typeof metadata.lambdaEndpoint === "string") {
        exports[`${metadata.lambdaEndpoint}Handler`] = controllerInstance[key];
      }
    }
  }
  return exports;
}