import axios from 'axios';
import  { load }  from 'cheerio';
import { promises as fs } from 'fs';
import  * as TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId } from '../config';

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

const productMonitor = async (product: Product) => {
    const { productUrl, desiredPrice, monitorEnabled } = product;
    const today = new Date().toISOString().split('T')[0];

    // Read the existing data from the JSON file
    let data: { products: Product[] } = { products: [] };
    try {
        const jsonData = await fs.readFile('../data.json', 'utf-8');
        data = JSON.parse(jsonData);
    } catch (error) {
        console.error('Error reading the data file:', error);
        return;
    }

    // Find the product in the data
    const existingProduct = data.products.find((p) => p.productUrl === productUrl);

    // Check if the product exists and the monitor is enabled
    if (existingProduct && existingProduct.monitorEnabled && existingProduct.date === today) {
        const result = existingProduct.result;
        console.log('Product data already exists for today:');
        console.log(result);
        return;
    }

    if (!monitorEnabled) {
        console.log('Product monitoring is disabled.');
        return;
    }

    try {
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
                data.products.push(updatedProduct);
            }

            // Write the updated data object to the JSON file
            await fs.writeFile('../data.json', JSON.stringify(data));

            console.log('Product data:');
            console.log(`- Title: ${title}`);
            console.log(`- Price: ${price}`);
            console.log(`- Matched: ${matched}`);

            // Send the result to Telegram
            if (telegramBotToken && telegramUserId) {
                const bot = new TelegramBot(telegramBotToken);
                const message = `Product: ${title}\nPrice: ${price}\nMatched: ${matched}`;
                await bot.sendMessage(telegramUserId, message);
              }
        } else {
            console.error('Error: ' + response.status);
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('Error: ' + error.message);
        }
    }
};

export const handler = async () => {
    try {
        const jsonData = await fs.readFile('../data.json', 'utf-8');
        const data = JSON.parse(jsonData);
        const products: Product[] = data.products || [];

        for (const product of products) {
            await productMonitor(product);
        }
    } catch (error) {
        console.error('Error reading the data file:', error);
    }
};