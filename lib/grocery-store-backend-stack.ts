import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class GroceryStoreBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // const groceryTableImp = Table.fromTableName(this, "groceryTable", "groceryTable")
    const groceryTable = new Table(this, "groceryTable", {
      tableName: "grocery_table",
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: AttributeType.STRING,
      },
    });

    groceryTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: {
        name: "GSI1PK",
        type: AttributeType.STRING,
      },
      sortKey: {
        name: "GSI1SK",
        type: AttributeType.STRING,
      },
    });

    const addGroceryItemsFn = new NodejsFunction(this, "addGroceryItemsFn", {
      entry: "lambdas/add-grocery-items-fn.ts",
      environment: {
        TableName: groceryTable.tableName,
      },
    });

    const getGroceryItemFn = new NodejsFunction(this, "getGroceryItemFn", {
      entry: "lambdas/get-grocery-item-fn.ts",
      environment: {
        TableName: groceryTable.tableName,
      },
    });

    groceryTable.grantWriteData(addGroceryItemsFn);
    groceryTable.grantReadData(getGroceryItemFn);

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "grocery-api",
    });

    httpApi.addRoutes({
      path: "/item",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "add-grocery-fn-integration",
        addGroceryItemsFn,
      ),
    });

    httpApi.addRoutes({
      path: "/item/{id}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "get-grocery-fn-integration",
        getGroceryItemFn,
      ),
    });

    new CfnOutput(this, "grocery-api-url", {
      value: httpApi.url ?? "unkown",
    });
  }
}
