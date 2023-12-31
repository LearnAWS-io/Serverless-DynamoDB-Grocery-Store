import { HttpApi, HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
  OutputFormat,
} from "aws-cdk-lib/aws-lambda-nodejs";
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

    const defaultLambdaParams: NodejsFunctionProps = {
      runtime: Runtime.NODEJS_18_X,
      bundling: {
        format: OutputFormat.ESM,
        minify: true,
        banner:
          "import { createRequire } from 'module';const require = createRequire(import.meta.url)",
        target: "node18",
      },
      memorySize: 500,
    };

    const addGroceryItemsFn = new NodejsFunction(this, "addGroceryItemsFn", {
      entry: "lambdas/add-grocery-items-fn.ts",
      environment: {
        TableName: groceryTable.tableName,
      },
      ...defaultLambdaParams,
    });

    const getGroceryItemFn = new NodejsFunction(this, "getGroceryItemFn", {
      entry: "lambdas/get-grocery-item-fn.ts",
      environment: {
        TableName: groceryTable.tableName,
      },
      ...defaultLambdaParams,
    });

    const listAllGroceryItemsFn = new NodejsFunction(
      this,
      "listAllGroceryItemsFn ",
      {
        entry: "lambdas/list-grocery-items-fn.ts",
        environment: {
          TableName: groceryTable.tableName,
        },
        ...defaultLambdaParams,
      },
    );

    const deleteGroceryItemFn = new NodejsFunction(
      this,
      "deleteGroceryItemFn",
      {
        entry: "lambdas/delete-grocery-item-fn.ts",
        environment: {
          TableName: groceryTable.tableName,
        },
        ...defaultLambdaParams,
      },
    );

    const updateGroceryItemFn = new NodejsFunction(
      this,
      "updateGroceryItemFn",
      {
        entry: "lambdas/update-grocery-item-fn.ts",
        environment: {
          TableName: groceryTable.tableName,
        },
        ...defaultLambdaParams,
      },
    );
    groceryTable.grantWriteData(addGroceryItemsFn);
    groceryTable.grantWriteData(deleteGroceryItemFn);
    groceryTable.grantReadData(getGroceryItemFn);
    groceryTable.grantReadData(listAllGroceryItemsFn);
    groceryTable.grantWriteData(updateGroceryItemFn);

    const httpApi = new HttpApi(this, "HttpApi", {
      apiName: "grocery-api",
    });

    // Add grocery items API
    httpApi.addRoutes({
      path: "/item",
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "add-grocery-fn-integration",
        addGroceryItemsFn,
      ),
    });

    // Add grocery items API
    httpApi.addRoutes({
      path: "/list_items",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "list-grocery-fn-integration",
        listAllGroceryItemsFn,
      ),
    });
    // GET grocery item API
    httpApi.addRoutes({
      path: "/item/{id}",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "get-grocery-fn-integration",
        getGroceryItemFn,
      ),
    });

    // DELETE grocery item API
    httpApi.addRoutes({
      path: "/item/{id}",
      methods: [HttpMethod.DELETE],
      integration: new HttpLambdaIntegration(
        "delete-grocery-fn-integration",
        deleteGroceryItemFn,
      ),
    });

    // ADD grocery item API
    httpApi.addRoutes({
      path: "/item/{id}",
      methods: [HttpMethod.PATCH],
      integration: new HttpLambdaIntegration(
        "update-grocery-item-fn-integration",
        updateGroceryItemFn,
      ),
    });

    new CfnOutput(this, "grocery-api-url", {
      value: httpApi.url ?? "unkown",
    });
  }
}
