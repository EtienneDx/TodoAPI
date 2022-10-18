import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { getList, getRoot, putObject } from './dynamodb';
import { error, ErrorCode, success } from './responses';
import { CATEGORY } from './todo-objects';

export async function createHandler(event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> {
  const data = JSON.parse(event.body ?? "");
  if(typeof(data.type) !== "string") {
    return error(ErrorCode.missing_parameter);
  }
  if(data.type === "list") {
    if(typeof(data.name) !== "string") {
      return error(ErrorCode.missing_parameter);
    }
    const root = await getRoot();
    if(root.lists.find(l => l === data.name)) {
      return error(ErrorCode.list_exists);
    }
    root.lists.push(data.name);
    try {
      await putObject(root);
      await putObject({
        Category: CATEGORY.LIST,
        SubCategory: data.name,
        items: [],
      });
    }
    catch(e: unknown) {
      console.error(JSON.stringify(e));
      return error(ErrorCode.database_unreachable);
    }
  }
  else if(data.type === "item") {
    if(typeof(data.listName) !== "string" || typeof(data.item) !== "string") {
      return error(ErrorCode.missing_parameter);
    }
    const list = await getList(data.listName);
    if(list === null) {
      return error(ErrorCode.list_not_found);
    }
    list.items.push(data.item);
    try {
      await putObject(list);
    }
    catch(e: unknown) {
      console.error(JSON.stringify(e));
      return error(ErrorCode.database_unreachable);
    }
  }
  else {
    return error(ErrorCode.invalid_parameter);
  }

  return success({
    success: true,
    message: `Successfully created ${data.type}`,
  });
}

export async function getHandler(event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> {
  const data = event.queryStringParameters ?? {}
  if(typeof data["type"] !== "string" || (data["type"] === "list" && typeof data["name"] !== "string")) {
    return error(ErrorCode.missing_parameter);
  }
  if(data["type"] === "root") {
    const root = await getRoot();
    return success(root);
  }
  else if (data["type"] === "list") {
    const list = await getList(data["name"] ?? "");
    if(list === null) {
      return error(ErrorCode.list_not_found);
    }
    return success(list);
  }
  return error(ErrorCode.invalid_parameter);
}

export async function deleteHandler(event: APIGatewayEvent, _context: Context): Promise<APIGatewayProxyResult> {
  const data = JSON.parse(event.body ?? "{}");
  if(data.type !== "item" || typeof(data.listName) !== "string" || typeof(data.item) !== "string") {
    return error(ErrorCode.invalid_parameter);
  }
  const list = await getList(data.listName);
  if(list === null) {
    return error(ErrorCode.list_not_found);
  }
  list.items.splice(list.items.indexOf(data.item), 1);
  try {
    await putObject(list);
  }
  catch(e: unknown) {
    console.error(JSON.stringify(e));
    return error(ErrorCode.database_unreachable);
  }
  return success(list);
}