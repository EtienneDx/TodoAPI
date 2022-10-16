import { App } from 'aws-cdk-lib';
import { ApiStack } from './stacks/app-stack';

const stages = ["dev", "prod"];

const app = new App();
for(const stage of stages) {
  new ApiStack(app, `todo-stack-${stage}`, {
    env: {
      region: "eu-west-3",
    },
    stage,
  });
}