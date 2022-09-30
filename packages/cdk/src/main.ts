import { App } from 'aws-cdk-lib';
import { AppStack } from './stacks/app-stack';

const stages = ["dev", "prod"];

const app = new App();
for(const stage of stages) {
  new AppStack(app, `todo-stack-${stage}`, {
    env: {
      region: "eu-west-3",
    },
    stage,
  });
}