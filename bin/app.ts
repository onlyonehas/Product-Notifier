import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductNotifierStack } from '../lib/product_notifier-stack';

const app = new cdk.App();

new ProductNotifierStack(app, 'ProductNotifierStack');

app.synth();