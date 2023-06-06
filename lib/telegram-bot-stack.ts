import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as path from 'path';
import { Construct } from 'constructs';

export class TelegramBotStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'TelegramBotQueue');

    const lambdaFn = new Function(this, 'TelegramBotLambda', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../src/bot')),
      environment: {
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || '',
      },
    });

    queue.grantSendMessages(lambdaFn);
    lambdaFn.addEventSource(new SqsEventSource(queue, { batchSize: 1 }));

    new CfnOutput(this, 'QueueURL', {
      value: queue.queueUrl,
    });
  }
}
