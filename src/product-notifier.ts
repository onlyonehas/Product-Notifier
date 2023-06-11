import { load } from 'cheerio';
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId } from '../config';
import { dataBucket } from '../config';
import axios from 'axios';

interface Params {
  Bucket: string;
  Key: string;
}

interface Product {
  date: string;
  result: any;
  productUrl: string;
  desiredPrice: number;
  monitorEnabled: boolean;
}

interface Original {
  products?: Product[];
}

interface Result {
  title: string;
  price: string;
  matched: string;
}

const s3 = new S3Client({ region: "eu-west-1" });

const getProductData = async (): Promise<Product[]> => {
  const response = await s3.send(new GetObjectCommand({ ...dataBucket }));
  const jsonData = await response?.Body?.transformToString();
  return jsonData ? JSON.parse(jsonData) : [];
};

const updateProductData = async (data: Product[]) => {
  console.info('Updating file in S3');
  return await s3.send(new PutObjectCommand({ ...dataBucket, Body: JSON.stringify(data) }));
};

const sendTelegramMessage = async (message: string) => {
  if (telegramBotToken && telegramUserId) {
    const bot = new TelegramBot(telegramBotToken);
    console.info('Sending message to Telegram');
    const { message_id, date, text } = await bot.sendMessage(telegramUserId, message);
    return { message_id, date, text };
  }
  return null;
};
const getProductHtml = async (productUrl: string) => {
    try {
      const response = await axios.get(productUrl);
      if (response.status !== 200) {
        throw new Error(`Error retrieving HTML. Status code: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error('Error retrieving HTML:', error);
      throw error;
    }
  };

const productMonitor = async (product: Product, data: Product[], params: Params) => {
  const { productUrl, desiredPrice, monitorEnabled } = product;
  const today = new Date().toISOString().split('T')[0];
  let botResponse = null;

  try {
    if (!monitorEnabled) {
      console.log('Product monitoring is disabled.');
      return;
    }

    const html = await getProductHtml(productUrl);

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

    const existingProductIndex = data.findIndex((p: Product) => p.productUrl === productUrl);
    if (existingProductIndex !== -1) {
      // Update the existing product
      data[existingProductIndex] = updatedProduct;
    } else {
      // Add the new product to the data
      data.push(updatedProduct);
    }

    await updateProductData(data);

    const message = `Product: ${title}\nCurrent Price: ${price}\nDesired Price: ${desiredPrice}\nMatched: ${matched}`;
    botResponse = await sendTelegramMessage(message);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    }
  }
  return botResponse;
};

export const handler = async (event: any) => {
  let response = null;
  try {
    const data = await getProductData();
    const tasks = data.map((product) => productMonitor(product, data, dataBucket));
    const results = await Promise.all(tasks);
    response = results;
  } catch (error) {
    console.error('Error reading the data file:', error);
  }
  return response;
};
