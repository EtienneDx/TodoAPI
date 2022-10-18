import * as AWS from 'aws-sdk'; 
import { AttributeMap, KeySchemaElement, Key } from 'aws-sdk/clients/dynamodb';
import { DynamoDB } from 'aws-sdk';

function itemToKey(item: AttributeMap, keySchema: KeySchemaElement[]): Key {
    let itemKey: Key = {};
    keySchema.map(key => { 
        itemKey = { ...itemKey, [key.AttributeName]: item[key.AttributeName] };
    });
    return itemKey;
};

export async function clearTable(dynamoDB: AWS.DynamoDB, tableName: string): Promise<void> {
    // get the table keys
    const { Table = {} } = await dynamoDB
      .describeTable({ TableName: tableName })
      .promise();
  
    const keySchema = Table.KeySchema || [];
  
    // get the items to delete
    const scanResult = await dynamoDB.scan({
        AttributesToGet: keySchema.map(key => key.AttributeName),
        TableName: tableName,
        ConsistentRead: true
    }).promise();
    const items = scanResult.Items || [];
  
    if (items.length > 0) {
        const deleteRequests = items.map(item => ({
            DeleteRequest: { Key: itemToKey(item, keySchema) },
        }));

        await dynamoDB
            .batchWriteItem({ RequestItems: { [tableName]: deleteRequests } })
            .promise();
    }
};

export async function clearAllTables(dynamoDb: DynamoDB): Promise<void> {
    const { TableNames } = await dynamoDb.listTables().promise();
    for (const tableName of TableNames ?? []) {
        await clearTable(dynamoDb, tableName);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
}