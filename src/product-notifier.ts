import { load } from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId, FileName } from '../config';
import axios from 'axios';
import fs from 'fs/promises';
import {
  storeMessage,
  escapeMarkdown,
  readMessageIds,
  promptSelect
} from './helpers';

const bot = new TelegramBot(telegramBotToken);
let counter = 0;

interface Product {
  date: string;
  result: Result;
  price: Price;
  productUrl: string;
  desiredPrice: number;
  monitorEnabled: boolean;
}

interface Result {
  title: string;
  newPrice: string;
  matched: string;
}

interface Price {
  price: string;
  cost: string;
  profit: string;
  roi?: string;
}

const getProductData = async (): Promise<Product[]> => {
  try {
    const jsonData = await fs.readFile(FileName.Data, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('Error reading data file:', error);
    return [];
  }
};

const updateProductData = async (data: Product[]): Promise<void> => {
  try {
    await fs.writeFile(FileName.Data, JSON.stringify(data));
  } catch (error) {
    console.error('Error updating data file:', error);
  }
};

const sendTelegramMessage = async (message: string) => {
  if (!telegramBotToken || !telegramUserId) {
    return null;
  }

  console.info('Sending message to Telegram');
  const { message_id, date, text } = await bot.sendMessage(
    telegramUserId,
    message,
    {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }
  );

  storeMessage(FileName.Message, message_id);
  return { message_id, date, text };
};

const deleteMessages = async (messageIds: number[]): Promise<void> => {
  try {
    for (const messageId of messageIds) {
      await bot.deleteMessage(telegramUserId, messageId);
      console.info(`Deleted message with ID: ${messageId}`);
    }

    const newMessageIds = messageIds.filter(id => !messageIds.includes(id));
    await fs.writeFile(FileName.Message, newMessageIds.join('\n'));
  } catch (error) {
    console.error('Error deleting messages:', error);
  }
};

const getProductHtml = async (productUrl: string): Promise<string> => {
  try {
    const response = await axios.get(productUrl);
    if (response.status !== 200) {
      throw new Error(
        `Error retrieving HTML. Status code: ${response.status}`
      );
    }
    return response.data;
  } catch (error) {
    console.error('Error retrieving HTML:', error);
    throw error;
  }
};

const calculateNewProfitAndROI = (priceInfo: Price): { newProfit: string; newROI: string } => {
  const { price, cost, profit } = priceInfo;
  const fees = parseFloat(price) - parseFloat(cost) - parseFloat(profit);
  const priceFloat = parseFloat(price);
  const newProfit = (priceFloat - parseFloat(cost) - fees).toFixed(2) || '0';
  const newROI = (((priceFloat - parseFloat(cost) - fees) / parseFloat(cost)) * 100).toFixed(2) || '0';

  return {
    newProfit,
    newROI,
  };
};

const processProduct = async (product: Product, data: Product[]): Promise<null | object> => {
  const { productUrl, desiredPrice, monitorEnabled, price } = product;
  const today = new Date().toISOString().split('T')[0];
  let botResponse: null | object = null;

  try {
    if (!monitorEnabled) {
      console.info('Product monitoring is disabled.');
      return null;
    }

    const html = await getProductHtml(productUrl);
    const $ = load(html);

    const title = $('#productTitle').text().trim();
    const newPrice = $('.a-offscreen').first().text().trim();
    const priceFloat = parseFloat(newPrice.replace('£', ''));
    const matched = priceFloat >= desiredPrice ? '✅' : '❌';

    const result: Result = {
      title,
      newPrice,
      matched,
    };

    const { newProfit, newROI } = calculateNewProfitAndROI(price);

    const profitEmoji = parseFloat(newProfit ?? '0') >= 1.5 ? '🟢' : parseFloat(newProfit ?? '0') >= 1 ? '🟠' : '🔴';
    const roiEmoji = parseFloat(newROI ?? '0') >= 25 ? '🟢' : parseFloat(newROI ?? '0') >= 20 ? '🟠' : '🔴';

    const updatedProduct: Product = {
      productUrl,
      desiredPrice,
      monitorEnabled: true,
      date: today,
      result,
      price,
    };

    const existingProductIndex = data.findIndex((p: Product) => p.productUrl === productUrl);
    if (existingProductIndex !== -1) {
      data[existingProductIndex] = updatedProduct;
    } else {
      data.push(updatedProduct);
    }
    await updateProductData(data);
    console.info(`Product: \`${title}\ ${profitEmoji}-${roiEmoji}`);

    const escapedProfit = escapeMarkdown(newProfit);
    const escapedPrice = escapeMarkdown(newPrice);
    const escapedROI = escapeMarkdown(newROI);
    const escapedTitle = escapeMarkdown(title);

    const message = `
      *Product:* [${escapedTitle}](${productUrl})
      *Current Price:* ${escapedPrice}
      *Profit:* £ ${escapedProfit} ${profitEmoji}
      *ROI:* ${escapedROI} ${roiEmoji}
    `;

    botResponse = await sendTelegramMessage(message);
    counter++;
  } catch (error: unknown) {
    if (error instanceof Error) {
      storeMessage(FileName.Error, JSON.stringify({ product }) + ',');
      console.error('Error:', error.message);
    }
  }
  return botResponse;
};

export const handler = async () => {
  const messageIds = await readMessageIds();
  if (messageIds) {
    await deleteMessages(messageIds);
  }

  let response: null | object = null;
  try {
    const shortDateTime = new Date().toLocaleString('en-UK', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const stars = `\\*\\*\\*\\*`;
    await sendTelegramMessage(`${stars} *PRODUCT UPDATE* ${shortDateTime} ${stars}`);

    const data = await getProductData();
    const allOption = 'All products';
    const products = data.map((product) => product.result?.title || product.productUrl);

    const reprocessChoice = await promptSelect(
      'Select which products to reprocess:',
      [allOption, ...products]
    );

    const productsToProcess = reprocessChoice.includes(allOption)
      ? data
      : reprocessChoice.map((choice) => data[parseInt(choice.split('. ')[0]) - 1]);

    for (const product of productsToProcess) {
      const result = await processProduct(product, data);
      response = result;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await sendTelegramMessage(`${stars} *${counter}/${data.length}  FINISHED*\\! ${shortDateTime} ${stars}`);
  } catch (error) {
    console.error('Error reading the data file:', error);
  }
  return response;
};

(async () => {
  await handler();
})();
