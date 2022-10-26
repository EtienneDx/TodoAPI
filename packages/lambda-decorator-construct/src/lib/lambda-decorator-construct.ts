import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from "constructs";
import { existsSync } from "fs";
import { LambdaController } from "lambda-decorator";
import path = require("path");
import { cwd } from "process";
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export interface LambdaDecoratorConstructProps {
  controllerClasses: unknown | unknown[],
  buildDirectory: string,
  functionPrefix?: string,
  stage?: string,
  environment?: Record<string, string>,
}

interface LambdaDescriptor {
  endpoint: string,
  method: string,
  handler: string,
}

export class LambdaDecoratorConstruct extends Construct {
  props: LambdaDecoratorConstructProps;
  id: string;

  functions: Record<string, LambdaFunction> = {};
  apiGateway: RestApi | null = null;

  constructor(scope: Construct, id: string, props: LambdaDecoratorConstructProps) {
    super(scope, id);
    this.id = id;
    this.props = props;

    const lambdas: LambdaDescriptor[] = [];
    
    for (const controller of props.controllerClasses as { new(): LambdaController }[]) {
      const metadataKeys = Reflect.getMetadataKeys(controller.prototype);
      for(const key of metadataKeys) {
        const metadata = Reflect.getMetadata(key, controller.prototype);
        if(typeof metadata.lambdaEndpoint === "string") {
          if(lambdas.includes(metadata.lambdaEndpoint)) {
            throw new Error(`Duplicate endpoint found: ${metadata.lambdaEndpoint}`);
          }
          lambdas.push({
            endpoint: metadata.lambdaEndpoint,
            method: metadata.lambdaMethod ?? "GET",
            handler: `index.default.${metadata.lambdaEndpoint}Handler`,
          });
        }
      }
    }

    if(lambdas.length === 0) {
      throw new Error("Couldn't find any lambda in provided classes");
    }
    
    this.createLambdas(lambdas);
    this.createApiGateway(lambdas);
  }

  createLambdas(lambdas: LambdaDescriptor[]) {
    const apiPath = path.resolve(cwd(), this.props.buildDirectory);
    if(!existsSync(apiPath)) {
      throw new Error(`The directory ${apiPath} does not exist. Did you forget to build it?`);
    }
    for(const api of lambdas) {
      this.functions[api.endpoint] = new LambdaFunction(this, `${this.props.functionPrefix ?? this.id}-${api.endpoint}-${this.props.stage ?? "prod"}`, {
          functionName: `${this.props.functionPrefix ?? this.id}-${api.endpoint}-${this.props.stage ?? "prod"}`,
          runtime: Runtime.NODEJS_16_X,
          handler: api.handler,
          code: Code.fromAsset(apiPath),
          environment: this.props.environment,
        });
    }
  }

  createApiGateway(lambdas: LambdaDescriptor[]) {
    this.apiGateway = new RestApi(this, `${this.props.functionPrefix ?? this.id}-api-${this.props.stage}`, {
      restApiName: `${this.props.functionPrefix ?? this.id}-api-${this.props.stage}`,
      deployOptions: {
        stageName: this.props.stage,
      },
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: Cors.ALL_METHODS,
        allowCredentials: true,
        // APIs are freely accessible by anyone
        allowOrigins: ["*"],
      },
    });
    const apiGatewayPrincipal = new ServicePrincipal('apigateway.amazonaws.com');
    for(const api of lambdas) {
      const resource = this.apiGateway.root.addResource(api.endpoint);
      resource.addMethod(api.method, new LambdaIntegration(this.functions[api.endpoint]));
      this.functions[api.endpoint].grantInvoke(apiGatewayPrincipal);
    }
  }
}