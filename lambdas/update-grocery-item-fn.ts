import { APIGatewayProxyHandlerV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import {
  AttributeValue,
  GetItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { errors } from "@vinejs/vine";
import { dbClient } from "./db-client";
import { groceryObjItemValidator } from "../schemas/add-grocery";

const headers = {
  "Content-Type": "application/json",
};

const TableName = process.env?.TableName;
export const handler: APIGatewayProxyHandlerV2 = async (e) => {
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
    if (!e.body) {
      throw "Body is required";
    }

    const groceryItem = await groceryObjItemValidator.validate(
      JSON.parse(e.body),
    );

    let UpdateExpression = `SET `;
    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, AttributeValue> = {};

    const { category, name, type, ...restItems } = groceryItem;
    const groceryItemWithGSI = {
      ...restItems,
      GSI1PK: category,
      GSI1SK: `${name}#${type}`,
    };

    const groceryItemKeys = Object.keys(groceryItemWithGSI);

    groceryItemKeys.forEach((key, idx) => {
      const isLastItem = idx + 1 === groceryItemKeys.length;
      UpdateExpression += `#${key} = :${key}${!isLastItem ? ", " : ""}`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = groceryItemWithGSI[key];
    });

    console.log(
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    );

    const getItemCmd = new UpdateItemCommand({
      TableName,
      Key: {
        PK: { S: id },
        SK: { S: id },
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues: marshall(ExpressionAttributeValues),
      ReturnValues: "ALL_NEW",
    });

    const res = await dbClient.send(getItemCmd);

    if (!res.Attributes) {
      return { statusCode: 401, body: "No attributes returned" };
    }

    const item = unmarshall(res.Attributes);
    const { PK, SK, GSI1PK, GSI1SK, ...restItem } = item;
    const [nameSk, typeSk] = GSI1SK.split("#");

    const response: APIGatewayProxyResultV2 = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...restItem,
        id: PK,
        category: GSI1PK,
        name: nameSk,
        type: typeSk,
      }),
    };

    return response;
  } catch (err) {
    console.log(err);
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // array created by SimpleErrorReporter
      return {
        statusCode: 400,
        body: JSON.stringify(err),
      };
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
