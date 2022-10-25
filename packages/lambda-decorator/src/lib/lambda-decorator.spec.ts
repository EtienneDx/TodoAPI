import { lambdaDecorator } from './lambda-decorator';

describe('lambdaDecorator', () => {
  it('should work', () => {
    expect(lambdaDecorator()).toEqual('lambda-decorator');
  });
});
