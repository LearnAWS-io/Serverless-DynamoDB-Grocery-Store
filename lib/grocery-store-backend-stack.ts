import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
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

    groceryTable.grantWriteData(addGroceryItemsFn);

    const fnUrl = addGroceryItemsFn.addFunctionUrl({
      authType: FunctionUrlAuthType.NONE,
    });

    new CfnOutput(this, "add-grocery-items-fn-url", {
      value: fnUrl.url,
    });
  }
}
