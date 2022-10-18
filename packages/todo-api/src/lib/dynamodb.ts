import { DynamoDB } from "aws-sdk";
import { CATEGORY, ListObject, RootObject } from "./todo-objects";

const config = process.env["JEST_WORKER_ID"] ? {
  endpoint: 'localhost:8000',
  sslEnabled: false,
  region: 'local-env',
} : {
  apiVersion: '2012-08-10'
};

export const ddb = new DynamoDB.DocumentClient(config);

const DYNAMO_DB_TABLE = process.env["DYNAMO_DB_TABLE"] ?? "todo-application-table";

const DEFAULT_ROOT: RootObject = {
  Category: CATEGORY.ROOT,
  SubCategory: CATEGORY.ROOT,
  lists: [],
};

export async function getRoot() : Promise<RootObject> {
  try {
    const response = await ddb.get({
      TableName: DYNAMO_DB_TABLE,
      Key: {
        Category: CATEGORY.ROOT,
        SubCategory: CATEGORY.ROOT,
      },
    }).promise();
    return response.Item as RootObject ?? DEFAULT_ROOT;
  }
  catch(e: unknown) {
    console.warn("Error while fetching root:", e);
    return DEFAULT_ROOT;
  }
}

export async function getList(name: string): Promise<ListObject | null> {
  try {
    const response = await ddb.get({
      TableName: DYNAMO_DB_TABLE,
      Key: {
        Category: CATEGORY.LIST,
        SubCategory: name,
      },
    }).promise();
    return response.Item as ListObject ?? null;
  }
  catch(e: unknown) {
    console.error("Error while fetching list:", e);
    return null;
  }
}

export async function putObject(item: RootObject | ListObject): Promise<void> {
  await ddb.put({
    TableName: DYNAMO_DB_TABLE,
    Item: item,
  }).promise();
}