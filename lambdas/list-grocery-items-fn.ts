import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import {
  ScanCommand,
  QueryCommand,
  AttributeValue,
} from "@aws-sdk/client-dynamodb";
import { dbClient } from "./db-client";
import { ResponseHeaders } from "./constants";
import { unmarshall } from "@aws-sdk/util-dynamodb";

export const handler: APIGatewayProxyHandlerV2 = async (e) => {
  const TableName = process.env.TableName;
  try {
    if (!TableName) {
      throw "TableName env variable is undefined";
    }

    const params = e.queryStringParameters;

    // run query command if we want to filter with category and item name
    const category = params?.category?.toUpperCase();
    const item_name = params?.name?.toUpperCase();

    const exprAttrValue: Record<string, AttributeValue> = {};
    if (category) {
      exprAttrValue[":category"] = { S: category };
      if (item_name) {
        exprAttrValue[":item_name"] = { S: item_name };
      }
    }

    const sharedCommandInput = {
      TableName,
      Limit: params?.limit ? Number(params.limit) : undefined,
      ExclusiveStartKey: params?.nextToken
        ? { PK: { S: params.nextToken }, SK: { S: params.nextToken } }
        : undefined,
    };

    const queryCmd = category
      ? new QueryCommand({
          IndexName: "GSI1",
          KeyConditionExpression: `GSI1PK = :category${
            item_name ? " AND begins_with(GSI1SK, :item_name)" : ""
          }`,
          ExpressionAttributeValues: exprAttrValue,
          ...sharedCommandInput,
        })
      : new ScanCommand({
          ...sharedCommandInput,
        });

    const res = await dbClient.send(queryCmd);
    if (!res.Items) {
      return {
        statusCode: 404,
      };
    }

    const items = res.Items.map((item) => {
      const { PK, SK, GSI1PK, GSI1SK, ...restItem } = unmarshall(item);
      const [name, type] = GSI1SK.split("#");
      return {
        ...restItem,
        id: PK,
        category: GSI1PK,
        name: name,
        type: type,
      };
    });

    const response: APIGatewayProxyResultV2 = {
      statusCode: 200,
      headers: ResponseHeaders,
      body: JSON.stringify({
        items,
        nextToken: res.LastEvaluatedKey?.PK.S,
      }),
    };

    return response;
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      headers: ResponseHeaders,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : err,
      }),
    };
  }
};
