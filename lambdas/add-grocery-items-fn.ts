import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { BatchWriteItemCommand } from "@aws-sdk/client-dynamodb";
import { addGroceryObjValidator } from "../schemas/add-grocery";
import { errors } from "@vinejs/vine";
import { dbClient } from "./db-client";
import { defKSUID32 } from "@thi.ng/ksuid";
import { BASE16 } from "@thi.ng/base-n";

const ksuid = defKSUID32({ base: BASE16, bytes: 8 });

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

    const batchPutItemCmd = new BatchWriteItemCommand({
      RequestItems: {
        [TableName]: items.map((item) => {
          const { type, name, price, stocks, category } = item;
          const id = ksuid.next();
          return {
            PutRequest: {
              Item: {
                PK: { S: id },
                SK: { S: id },
                GSI1PK: { S: category },
                GSI1SK: { S: `${name}#${type}` },
                stocks: { N: stocks.toString() },
                price: {
                  M: {
                    inr: { N: price.inr.toString() },
                    usd: { N: price.usd.toString() },
                  },
                },
              },
            },
          };
        }),
      },
    });

    const res = await dbClient.send(batchPutItemCmd);
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
