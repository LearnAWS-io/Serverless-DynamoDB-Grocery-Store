import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DeleteItemCommand } from "@aws-sdk/client-dynamodb";
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
    const deleteItemCmd = new DeleteItemCommand({
      TableName,
      Key: {
        PK: { S: id },
        SK: { S: id },
      },
      ConditionExpression: "attribute_exists(PK)",
    });
    const res = await dbClient.send(deleteItemCmd);
    if (res.$metadata.httpStatusCode !== 200) {
      return {
        body: JSON.stringify(res),
        statusCode: 404,
      };
    }

    const response: APIGatewayProxyResultV2 = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: res,
      }),
    };

    return response;
  } catch (err) {
    console.log(JSON.stringify(err));
    if (err instanceof Error) {
      if (err.name === "ConditionalCheckFailedException") {
        return { statusCode: 404 };
      }
    }
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : err,
      }),
    };
  }
};
