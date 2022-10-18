const TEST_TABLE = "TEST_TABLE";
const OLD_ENV = process.env;
process.env["DYNAMO_DB_TABLE"] = TEST_TABLE;

import { DynamoDB } from "aws-sdk";
import { ddb, getList, getRoot, putObject } from "./dynamodb";
import { clearTable } from "../test-utils/dynamodb-utils"
import { CATEGORY, ListObject } from "./todo-objects";
import { CreateTableInput } from "aws-sdk/clients/dynamodb";

const dynamoDb = new DynamoDB({
  endpoint: 'localhost:8000',
  sslEnabled: false,
  region: 'local-env',
});

const table = {
  TableName: TEST_TABLE,
  KeySchema: [{AttributeName: 'Category', KeyType: 'HASH'}, {AttributeName: "SubCategory", KeyType: "RANGE"}],
  AttributeDefinitions: [
    {AttributeName: 'Category', AttributeType: 'S'},
    {AttributeName: 'SubCategory', AttributeType: 'S'},
  ],
  ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
} as CreateTableInput;


describe('Dynamo DB', () => {
  beforeAll(async () => {
    jest.resetModules() // Clear the cache
    try {
      await dynamoDb.createTable({
  TableName: TEST_TABLE,
  KeySchema: [{AttributeName: 'Category', KeyType: 'HASH'}, {AttributeName: "SubCategory", KeyType: "RANGE"}],
  AttributeDefinitions: [
    {AttributeName: 'Category', AttributeType: 'S'},
    {AttributeName: 'SubCategory', AttributeType: 'S'},
  ],
  ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
}).promise();
    }
    catch(e: unknown) {
      console.warn("Couldn't create table. Is DynamoDB local running on prort 8000? `docker run -p 8000:8000 amazon/dynamodb-local`\n", e);
    }
  });

  afterAll(async () => {
    process.env = OLD_ENV; // Restore old environment
    try {
      await dynamoDb.deleteTable(table).promise();
    }
    catch(e: unknown) {
      console.warn("Couldn't create table", e);
    }
  });

  beforeEach(async () => {
    await clearTable(dynamoDb, process.env["DYNAMO_DB_TABLE"] ?? TEST_TABLE);
  });

  it("should return an empty root", async () => {
    const root = await getRoot();
    expect(root.Category).toBe(CATEGORY.ROOT);
    expect(root.SubCategory).toBe(CATEGORY.ROOT);
    expect(root.lists).toHaveLength(0);
  });

  it("should return an existing root", async () => {
    await ddb.put({
      TableName: TEST_TABLE,
      Item: {
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
        lists: ["list 1", "list 2"]
      },
    }).promise();
    const root = await getRoot();
    expect(root.Category).toBe(CATEGORY.ROOT);
    expect(root.SubCategory).toBe(CATEGORY.ROOT);
    expect(root.lists).toHaveLength(2);
    expect(root.lists[0]).toBe("list 1");
  });

  it("Shouldn't get an unexisting list", async () => {
    const list = await getList("doesn't exist");
    expect(list).toBeNull();
  });

  it("Should get a list", async () => {
    await ddb.put({
      TableName: TEST_TABLE,
      Item: {
        Category: CATEGORY.LIST,
        SubCategory: "list",
        items: ["item 1", "item 2"]
      },
    }).promise();
    const list = await getList("list");
    expect(list).not.toBeNull();
    expect(list?.Category).toBe(CATEGORY.LIST);
    expect(list?.SubCategory).toBe("list");
    expect(list?.items).toHaveLength(2);
  });

  it("Should put a list", async () => {
    await putObject({
      Category: CATEGORY.LIST,
      SubCategory: "list",
      items: ["item 1"],
    });
    const obj = await ddb.get({
      TableName: TEST_TABLE,
      Key: {
        Category: CATEGORY.LIST,
        SubCategory: "list",
      }
    }).promise();
    expect(obj.Item).not.toBeUndefined();
    const list = obj.Item as ListObject;
    expect(list?.Category).toBe(CATEGORY.LIST);
    expect(list?.SubCategory).toBe("list");
    expect(list?.items).toHaveLength(1);
  });
});