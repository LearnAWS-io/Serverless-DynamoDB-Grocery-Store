#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GroceryStoreBackendStack } from "../lib/grocery-store-backend-stack";

const app = new cdk.App();

new GroceryStoreBackendStack(app, "GroceryStoreBackendStack", {
  // put your aws account id `aws sts get-caller-identity`
  // put the region which is closest to your users
  env: { account: "205979422636", region: "us-east-1" },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
