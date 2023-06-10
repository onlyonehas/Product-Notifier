import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Function, Runtime, Code, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { dataBucket } from '../config';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class TelegramBotStack extends Stack {
  functionRole: any;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const queue = new Queue(this, 'TelegramBotQueue');

    const telegramBotLambda = new Function(this, 'TelegramBotLambda', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'src/telegram-bot.handler',
      code: Code.fromAsset('dist'),
      environment: {},
      architecture: Architecture.ARM_64
    });

    telegramBotLambda.addToRolePolicy(
      new PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        effect: Effect.ALLOW,
        resources: [`arn:aws:s3:::${dataBucket.Bucket}/*`],
      })
    );

    queue.grantSendMessages(telegramBotLambda);
    telegramBotLambda.addEventSource(new SqsEventSource(queue, { batchSize: 1 }));

    new CfnOutput(this, 'QueueURL', {
      value: queue.queueUrl,
    });
  }
}
