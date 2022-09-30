import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export async function createHandler(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(event),
    headers: HEADERS,
  }
}

export async function getHandler(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(event),
    headers: HEADERS,
  }
}

export async function deleteHandler(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(event),
    headers: HEADERS,
  }
}