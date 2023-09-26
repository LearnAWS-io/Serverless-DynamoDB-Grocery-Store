import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { GetItemCommand } from "@aws-sdk/client-dynamodb";
import { dbClient } from "./db-client";

const headers = {
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandlerV2 = async (e) => {
  const TableName = process.env.TableName;
  try {
    if (!TableName) {
      throw "TableName env variable is undefined";
    }

    if (!e.pathParameters) {
      throw "No paramer passed in the param";
    }
    const id = e.pathParameters.id;

    if (!id) {
      throw "ID params is null";
    }
    const getItemCmd = new GetItemCommand({
      TableName,
      Key: {
        PK: { S: id },
        SK: { S: id },
      },
    });
    const res = await dbClient.send(getItemCmd);
    if (!res.Item) {
      return {
        statusCode: 404,
      };
    }

    const item = unmarshall(res.Item);
    const { PK, SK, GSI1PK, GSI1SK, ...restItem } = item;
    const [name, type] = GSI1SK.split("#");

    const response: APIGatewayProxyResultV2 = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...restItem,
        id: PK,
        category: GSI1PK,
        name: name,
        type: type,
      }),
    };

    return response;
  } catch (err) {
    console.log(err);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : err,
      }),
    };
  }
};
