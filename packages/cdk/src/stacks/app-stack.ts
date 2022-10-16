import { Stack, App, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { existsSync } from 'fs';
import path = require('path');
import { cwd } from 'process';

export interface ApiStackProps extends StackProps {
  stage: string;
}

const APP_BUILD_DIRECTORY = "../../dist/packages/app";
const API_BUILD_DIRECTORY = "../../dist/packages/todo-api/src";

// handler is considered to be the `${key}Handler` function
const APIS = {
  create: {
    method: "POST",
    permissions: [
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
    ],
  },
  get: {
    method: "GET",
    permissions: [
      "dynamodb:GetItem",
      "dynamodb:BatchGetItem",
      // "dynamodb:Scan",// Scanning can be source of unecessary costs, I prefer to keep it unavailable
      "dynamodb:Query",
      "dynamodb:ConditionCheckItem"
    ],
  },
  delete: {
    method: "DELETE",
    permissions: [
      "dynamodb:DeleteItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:GetItem",
    ],
  },
};

export class ApiStack extends Stack {
  props: ApiStackProps;

  dynamoDbTable: Table;
  // note: Function renamed to LambdaFunction for eslint error
  lambdas: { [key: string]: LambdaFunction} = {} as { [key: string]: LambdaFunction};
  apiGateway: RestApi;
  s3Bucket: Bucket;
  s3Deployment: BucketDeployment;
  cloudfrontDistribution: Distribution;
  
  constructor(scope: App, id: string, props: ApiStackProps = {
    stage: "prod"
  }) {
    super(scope, id, props);
    this.props = props;

    this.createS3Bucket();
    this.createLambdas();
    this.createDynamoDb();
    this.createApiGateway();
    this.createCloudfrontDistribution();
    this.createS3Deployment();
  }
  createLambdas() {
    const apiPath = path.resolve(cwd(), API_BUILD_DIRECTORY);
    if(!existsSync(apiPath)) {
      throw new Error(`The directory ${apiPath} does not exist. Did you forget to run 'nx run todo-api:build'?`);
    }
    for(const api of Object.keys(APIS)) {
      this.lambdas[api] = new LambdaFunction(this, `todo-application-${api}-${this.props.stage}`, {
          functionName: `todo-application-${api}-${this.props.stage}`,
          runtime: Runtime.NODEJS_16_X,
          handler: `index.${api}Handler`,
          code: Code.fromAsset(apiPath),
          environment: {
            DYNAMO_DB_TABLE: `todo-application-table-${this.props.stage}`,
          },
        });
    }
  }
  createDynamoDb() {
    this.dynamoDbTable = new Table(this, `todo-application-table-${this.props.stage}`, {
      tableName: `todo-application-table-${this.props.stage}`,
      removalPolicy: RemovalPolicy.DESTROY,
      partitionKey: {
        name: "Category",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "SubCategory",
        type: AttributeType.STRING,
      },
    });
    for(const api of Object.keys(APIS)) {
      const lambda = this.lambdas[api];
      for(const permission of APIS[api].permissions) {
        this.dynamoDbTable.grant(lambda, permission);
      }
    }
  }
  createApiGateway() {
    this.apiGateway = new RestApi(this, `todo-application-api-${this.props.stage}`, {
      restApiName: `todo-application-api-${this.props.stage}`,
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
    for(const api of Object.keys(APIS)) {
      const resource = this.apiGateway.root.addResource(api);
      resource.addMethod(APIS[api].method, new LambdaIntegration(this.lambdas[api]));
      this.lambdas[api].grantInvoke(new ServicePrincipal('apigateway.amazonaws.com'));
    }
    
    new CfnOutput(this, `todo-application-api-gateway-url-${this.props.stage}`, {
      value: this.apiGateway.url.replace(/https?:\/\//, ""),
      description: "The url of the todo application API",
      exportName: `todo-application-api-gateway-url-${this.props.stage}`,
    }); 
  }
  createS3Bucket() {
    this.s3Bucket = new Bucket(this, `todo-application-${this.props.stage}`, {
      bucketName: `todo-application-${this.props.stage}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
   });
  }
  createCloudfrontDistribution() {
    // const apiGatewayUrl = Fn.importValue(`todo-application-api-gateway-url-${this.props.stage}`);

    this.cloudfrontDistribution = new Distribution(this, `todo-application-distribution-${this.props.stage}`, {
      defaultBehavior: {
        origin: new S3Origin(this.s3Bucket),
      },
      defaultRootObject: "index.html",
    });
    new CfnOutput(this,  `todo-application-cloudfront-distribution-url-${this.props.stage}`, {
      value: this.cloudfrontDistribution.distributionDomainName,
    });
  }
  createS3Deployment() {
    const appPath = path.resolve(cwd(), APP_BUILD_DIRECTORY);
    if(!existsSync(appPath)) {
      throw new Error(`The directory ${appPath} does not exist. Did you forget to run 'nx run app:build:production'?`);
    }
    this.s3Deployment = new BucketDeployment(this, `todo-application-deployment-${this.props.stage}`, {
      sources: [
        Source.asset(appPath, {
          exclude: ["assets/config.json"],
        }),
        Source.jsonData("assets/config.json", {
          apiGatewayUrl: this.apiGateway.url,
        })
      ],
      destinationBucket: this.s3Bucket,
      distribution: this.cloudfrontDistribution,
      distributionPaths: ["/*"],
    });
  }
}
