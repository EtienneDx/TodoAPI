jest.mock("./dynamodb");

import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { getRoot, getList, putObject } from "./dynamodb"
import { ErrorCode } from "./responses";
import { createHandler, deleteHandler, getHandler } from "./todo-api";
import { CATEGORY, ListObject, RootObject } from "./todo-objects";

const mockGetRoot = getRoot as unknown as jest.Mock<Promise<RootObject>>;
const mockGetList = getList as unknown as jest.Mock<Promise<ListObject | null>>;

describe('todoApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('get handler', () => {
    it('should get root', async () => {
      mockGetRoot.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
        lists: ["some list"],
      }));

      const data = await getHandler({
        queryStringParameters: {
          type: "root",
        },
      } as unknown as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(200);
      expect(JSON.parse(data.body)).toMatchObject({
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
        lists: ["some list"],
      });
    });

    it('should get list', async () => {
      mockGetList.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item 1", "item 2"],
      }));

      const data = await getHandler({
        queryStringParameters: {
          type: "list",
          name: "list",
        },
      } as unknown as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(200);
      expect(JSON.parse(data.body)).toMatchObject({
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item 1", "item 2"],
      });
    });

    it('should not get unknown list', async () => {
      mockGetList.mockImplementation(() => Promise.resolve(null));

      const data = await getHandler({
        queryStringParameters: {
          type: "list",
          name: "list",
        },
      } as unknown as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(404);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.list_not_found);
    });

    it('should fail with unknown parameter', async () => {
      const data = await getHandler({
        queryStringParameters: {
          type: "unknownType",
        },
      } as unknown as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(400);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.invalid_parameter);
    });
  });

  describe('create handler', () => {
    it('should create a list', async () => {
      mockGetRoot.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
        lists: [],
      }));

      const data = await createHandler({
        body: JSON.stringify({
          type: "list",
          name: "mylist"
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(200);
      expect(JSON.parse(data.body)['success']).toBeTruthy();
      expect(putObject).toBeCalledTimes(2);
    });
    it('should fail to create a duplicate list', async () => {
      mockGetRoot.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
        lists: ["mylist"],
      }));

      const data = await createHandler({
        body: JSON.stringify({
          type: "list",
          name: "mylist"
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(400);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.list_exists);
      expect(putObject).toBeCalledTimes(0);
    });

    it('should create an item', async () => {
      mockGetList.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item"],
      }));

      const data = await createHandler({
        body: JSON.stringify({
          type: "item",
          listName: "list",
          item: "new item",
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(200);
      expect(JSON.parse(data.body)['success']).toBeTruthy();
      expect(putObject).toBeCalledWith({
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item", "new item"],
      });
    });

    it('should fail to create an item in an non-existent list', async () => {
      mockGetList.mockImplementation(() => Promise.resolve(null));

      const data = await createHandler({
        body: JSON.stringify({
          type: "item",
          listName: "list",
          item: "new item",
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(404);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.list_not_found);
      expect(putObject).toBeCalledTimes(0);
    });
  });

  describe('delete handler', () => {
    it('should delete an item', async () => {
      mockGetList.mockImplementation(() => Promise.resolve({
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item 1", "item 2"],
      }));

      const data = await deleteHandler({
        body: JSON.stringify({
          type: "item",
          listName: "list",
          item: "item 1",
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(200);
      expect(JSON.parse(data.body).items).toHaveLength(1);
      expect(putObject).toHaveBeenCalled();
    });

    it('should fail to delete an item from a non existent list', async () => {
      mockGetList.mockImplementation(() => Promise.resolve(null));

      const data = await deleteHandler({
        body: JSON.stringify({
          type: "item",
          listName: "list",
          item: "new item",
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(404);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.list_not_found);
      expect(putObject).toBeCalledTimes(0);
    });

    it('should fail to delete a list', async () => {
      mockGetList.mockImplementation(() => Promise.resolve(null));

      const data = await deleteHandler({
        body: JSON.stringify({
          type: "list",
          listName: "list",
        }),
      } as APIGatewayProxyEvent, {} as Context);

      expect(data.statusCode).toBe(400);
      expect(JSON.parse(data.body).errorCode).toBe(ErrorCode.invalid_parameter);
      expect(putObject).toBeCalledTimes(0);
    });
  })
});