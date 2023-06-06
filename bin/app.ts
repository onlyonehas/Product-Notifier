#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductNotifierStack } from '../lib/product_notifier-stack';
import { TelegramBotStack } from '../lib/telegram-bot-stack


const app = new cdk.App();
new ProductNotifierStack(app, 'ProductNotifierStack', {});
new TelegramBotStack(app, 'TelegramBotStack', {});

app.synth();
