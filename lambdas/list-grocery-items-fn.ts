import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
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

    const scanCmd = new ScanCommand({
      TableName,
      Limit: params?.limit ? Number(params.limit) : undefined,
      ExclusiveStartKey: params?.nextToken
        ? { PK: { S: params.nextToken }, SK: { S: params.nextToken } }
        : undefined,
    });

    const res = await dbClient.send(scanCmd);
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
