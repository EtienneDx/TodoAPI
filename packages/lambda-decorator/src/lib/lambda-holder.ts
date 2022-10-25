import "reflect-metadata";
import { Context, APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";

type LambdaController = Record<string, (event: APIGatewayEvent, context: Context) => Promise<APIGatewayProxyResult>>;

export default function makeHandlers(...controllerClasses: { new(): LambdaController }[]) {
  const exports: LambdaController = {};
  for (const controller of controllerClasses) {
    const metadataKeys = Reflect.getMetadataKeys(controller.prototype);
    const controllerInstance = new controller();
    for(const key of metadataKeys) {
      const metadata = Reflect.getMetadata(key, controller.prototype);
      if(typeof metadata.lambdaEndpoint === "string") {
        exports[`${metadata.lambdaEndpoint}handler`] = controllerInstance[key];
      }
    }
  }
  return exports;
}