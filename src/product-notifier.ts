import axios from 'axios';
import { load } from 'cheerio';
import { S3 } from 'aws-sdk';
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId } from '../config';
import { dataBucket } from '../config';

interface params {
    Bucket: string,
    Key: string,
};

interface Product {
    date: string;
    result: any;
    productUrl: string;
    desiredPrice: number;
    monitorEnabled: boolean;
}

interface Result {
    title: string;
    price: string;
    matched: string;
}

const s3 = new S3();

const productMonitor = async (product: Product, data: Product[], params: params) => {
    const { productUrl, desiredPrice, monitorEnabled } = product;
    const today = new Date().toISOString().split('T')[0];
    let botResponse = null;

    try {

        // Find the product in the data
        const existingProduct = data.find((p: Product) => p.productUrl === productUrl);

        // Check if the product exists and the monitor is enabled
        // if (existingProduct?.date === today) {
        //     const result = existingProduct.result;
        //     console.log('Product data already exists for today:');
        //     return;
        // }

        if (!monitorEnabled) {
            console.log('Product monitoring is disabled.');
            return;
        }

        const response = await axios.get(productUrl);
        if (response.status === 200) {
            const html = response.data;
            const $ = load(html);

            const title = $('#productTitle').text().trim();
            const price = $('.a-offscreen').first().text().trim();
            const priceFloat = parseFloat(price.replace('£', ''));
            const matched = priceFloat >= desiredPrice ? '✅' : '❌';

            const result: Result = {
                title,
                price,
                matched,
            };

            // Create or update the product in the data
            const updatedProduct: Product = {
                productUrl,
                desiredPrice,
                monitorEnabled,
                date: today,
                result,
            };

            if (existingProduct) {
                // Update the existing product
                Object.assign(existingProduct, updatedProduct);
            } else {
                // Add the new product to the data
                data.push(updatedProduct);
            }

            console.log('Product data:');
            console.log(`- Title: ${title}`);
            console.log(`- Current Price: ${price}`);
            console.log(`- Matched: ${matched}`);

            // Send the result to Telegram
            if (telegramBotToken && telegramUserId) {
                const bot = new TelegramBot(telegramBotToken);
                const message = `Product: ${title}\n Current Price: ${price}\nDesired Price: ${desiredPrice}\n Matched: ${matched}`;
                botResponse = await bot.sendMessage(telegramUserId, message);
            }
        } else {
            console.error('Error: ' + response.status);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error: ' + error.message);
        }
    }
    return botResponse;
};

export const handler = async (event: any) => {
   let response = null
    try {
        const jsonData = await s3.getObject(dataBucket).promise();
        const data = JSON.parse(jsonData.Body?.toString() ?? '');
        const products: Product[] = data || [];

        for (const product of products) {
            response = await productMonitor(product, products, dataBucket);
        }
    } catch (error) {
        console.error('Error reading the data file:', error);
    }
    return response;
};