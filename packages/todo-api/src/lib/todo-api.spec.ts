import { Context, APIGatewayEvent } from 'aws-lambda';
import { createHandler } from './todo-api';

describe('todoApi', () => {
  it('should work', async () => {
    expect(await createHandler({} as APIGatewayEvent, {} as Context)).toReturn();
  });
});
