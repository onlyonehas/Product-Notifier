import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Schedule, Rule } from 'aws-cdk-lib/aws-events';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { dataBucket } from '../config';
import { Duration } from 'aws-cdk-lib';

export class ProductNotifierStack extends cdk.Stack {
  functionRole: any;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an AWS Lambda function for the product notifier
    const productNotifierFunction = new Function(this, 'ProductNotifierFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'src/product-notifier.handler',
      code: Code.fromAsset('dist'),
      environment: {},
      architecture: Architecture.ARM_64,
      memorySize: 512, 
      timeout: Duration.seconds(60)
    });

    productNotifierFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        effect: Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataBucket.Bucket}/*`],
      })
    );

    // Create a CloudWatch Events rule to schedule the product notifier function
    const rule = new Rule(this, 'ScheduleRule', {
      schedule: Schedule.expression('cron(30 16 * * ? *)'), // Run daily at midnight
    });
    rule.addTarget(new LambdaFunction(productNotifierFunction));
  }
}
