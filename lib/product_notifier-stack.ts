import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class ProductNotifierStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an AWS Lambda function for the product notifier
    const productNotifierFunction = new lambda.Function(this, 'ProductNotifierFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TELEGRAM_BOT_TOKEN: '<YOUR_TELEGRAM_BOT_TOKEN>',
        TELEGRAM_CHAT_ID: '<YOUR_TELEGRAM_CHAT_ID>'
      }
    });

    // Create a CloudWatch Events rule to schedule the product notifier function
    const rule = new events.Rule(this, 'ScheduleRule', {
      schedule: events.Schedule.expression('cron(0 0 * * ? *)'), // Run daily at midnight
    });
    rule.addTarget(new targets.LambdaFunction(productNotifierFunction));
  }
}
