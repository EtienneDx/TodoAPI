import { JsonLambdaError, jsonRequest, jsonResponse, lambdaHandler, queryRequest, validate, withError } from "lambda-decorator";
import { getList, getRoot, putObject } from './dynamodb';
import { MyLambdaError, ErrorCode } from './responses';
import { CATEGORY, ListObject, RootObject } from './todo-objects';

export type CreateRequest = {
  type: "list",
  name: string,
} | {
  type: "item",
  listName: string,
  item: string,
};
export type CreateResponse = {
  success: true,
  message: string,
};

export type GetRequest = {
  type: "root",
} | {
  type: "list",
  name: string,
};
export type GetResponse = ListObject | RootObject;

export type DeleteRequest = {
  type: "list",
  listName: string,
  item: string,
};
export type DeleteResponse = ListObject;

export default class TodoController {
  @lambdaHandler({
    method: "POST",
  })
  @jsonRequest({
    type: "string",
    name: ["string", "undefined"],
    listName: ["string", "undefined"],
    item: ["string", "undefined"],
  })
  @jsonResponse()
  @withError(JsonLambdaError)
  @validate(({ type }: CreateRequest) => ["list", "item"].includes(type), new MyLambdaError(ErrorCode.invalid_parameter))
  @validate((request: CreateRequest) => request.type === "item" || typeof request.name === "string", new MyLambdaError(ErrorCode.invalid_parameter))
  @validate((request: CreateRequest) => request.type === "list" || (typeof request.listName === "string" && typeof request.item === "string"), new MyLambdaError(ErrorCode.invalid_parameter))
  async create(request: CreateRequest): Promise<CreateResponse> {
    if(request.type === "list") {
      const root = await getRoot();
      if(root.lists.find(l => l === request.name)) {
        throw new MyLambdaError(ErrorCode.list_exists);
      }
      root.lists.push(request.name);
      try {
        await putObject(root);
        await putObject({
          Category: CATEGORY.LIST,
          SubCategory: request.name,
          items: [],
        });
      }
      catch(e: unknown) {
        throw new MyLambdaError(ErrorCode.database_unreachable);
      }
    }
    else if(request.type === "item") {
      const list = await getList(request.listName);
      if(list === null) {
        throw new MyLambdaError(ErrorCode.list_not_found);
      }
      list.items.push(request.item);
      try {
        await putObject(list);
      }
      catch(e: unknown) {
        throw new MyLambdaError(ErrorCode.database_unreachable);
      }
    }

    return {
      success: true,
      message: `Successfully created ${request.type}`,
    };
  }

  @lambdaHandler({
    method: "GET",
  })
  @queryRequest({
    type: "string",
    name: ["string", "undefined"],
  })
  @jsonResponse()
  @withError(JsonLambdaError)
  @validate((request: GetRequest) => request.type === "root" || (request.type === "list" && typeof request.name === "string"), new MyLambdaError(ErrorCode.invalid_parameter))
  async get(request: GetRequest): Promise<GetResponse> {
    if(request.type === "root") {
      const root = await getRoot();
      return root;
    }
    const list = await getList(request.name ?? "");
    if(list === null) {
      throw new MyLambdaError(ErrorCode.list_not_found);
    }
    return list;
  }

  @lambdaHandler({
    method: "DELETE",
  })
  @jsonRequest({
    type: "string",
    listName: "string",
    item: "string",
  })
  @jsonResponse()
  @withError(JsonLambdaError)
  async delete(request: DeleteRequest): Promise<DeleteResponse> {
    const list = await getList(request.listName);
    if(list === null) {
      throw new MyLambdaError(ErrorCode.list_not_found);
    }
    list.items.splice(list.items.indexOf(request.item), 1);
    try {
      await putObject(list);
    }
    catch(e: unknown) {
      throw new MyLambdaError(ErrorCode.database_unreachable);
    }
    return list;
  }
}