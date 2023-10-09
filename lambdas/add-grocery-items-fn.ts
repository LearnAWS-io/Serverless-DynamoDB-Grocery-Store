import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { BatchWriteItemCommand, WriteRequest } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { addGroceryObjValidator } from "../schemas/add-grocery";
import { errors } from "@vinejs/vine";
import { dbClient } from "./db-client";
import { defKSUID32 } from "@thi.ng/ksuid";
import { BASE16 } from "@thi.ng/base-n";
import { ResponseHeaders } from "./constants";

const ksuid = defKSUID32({ base: BASE16, bytes: 8 });

export const handler: APIGatewayProxyHandlerV2<string> = async (e) => {
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

    const putRequestItems: WriteRequest[] = items.map((item) => {
      const { type, name, price, stocks, category } = item;
      const id = ksuid.next();
      const reqItem = {
        PK: id,
        SK: id,
        GSI1PK: category,
        GSI1SK: `${name}#${type}`,
        stocks: stocks,
        price: {
          inr: price.inr,
          usd: price.usd,
        },
      };

      return {
        PutRequest: {
          Item: marshall(reqItem),
        },
      };
    });

    const batchPutItemCmd = new BatchWriteItemCommand({
      RequestItems: {
        [TableName]: putRequestItems,
      },
    });

    await dbClient.send(batchPutItemCmd);
    const reqIds = putRequestItems.map((req) => req.PutRequest?.Item?.PK.S);
    return {
      headers: ResponseHeaders,
      statusCode: 200,
      body: JSON.stringify({
        items: reqIds,
      }),
    };
  } catch (err) {
    console.log(err);
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // array created by SimpleErrorReporter
      return {
        statusCode: 400,
        headers: ResponseHeaders,
        body: JSON.stringify({ error: err }),
      };
    }
    return {
      statusCode: 400,
      headers: ResponseHeaders,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : err,
      }),
    };
  }
};
