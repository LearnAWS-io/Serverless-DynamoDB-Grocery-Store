import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { errors } from "@vinejs/vine";
import { addGroceryObjValidator } from "../schemas/add-grocery";

export const handler: APIGatewayProxyHandlerV2<
  Record<string, unknown>
> = async (e) => {
  const body = e.body;
  try {
    if (!body) {
      throw "Body is empty";
    }
    const json = JSON.parse(body);
    const items = await addGroceryObjValidator.validate(json);

    return {
      body: { message: items.length },
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
