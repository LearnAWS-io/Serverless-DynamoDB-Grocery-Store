import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import { errors } from "@vinejs/vine";
import { addGroceryObjValidator } from "../schemas/add-grocery";
import { dbClient } from "./db-client";

export const handler: APIGatewayProxyHandlerV2<
  Record<string, unknown>
> = async (e) => {
  const body = e.body;
  const TableName = process.env.TableName;
  try {
    if (!TableName) {
      throw "TableName env variable is undefined";
    }
    if (!body) {
      throw "Body is empty";
    }
    const json = JSON.parse(body);
    const items = await addGroceryObjValidator.validate(json);
    const { type, name, price, stocks, category } = items[0];

    const putItemCmd = new PutItemCommand({
      TableName,
      Item: {
        PK: { S: category },
        SK: { S: `${name}#${type}` },
        stocks: { N: stocks.toString() },
        price: {
          M: {
            inr: { N: price.inr.toString() },
            usd: { N: price.usd.toString() },
          },
        },
      },
    });

    const res = await dbClient.send(putItemCmd);
    return {
      body: res,
    };
  } catch (err) {
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // array created by SimpleErrorReporter
      return {
        statusCode: 400,
        body: err,
      };
    }
    return {
      statusCode: 400,
      body: {
        error: err instanceof Error ? err.message : err,
      },
    };
  }
};
