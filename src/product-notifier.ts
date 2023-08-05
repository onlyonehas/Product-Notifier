import { load } from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId, FileName } from '../config';
import axios from 'axios';
import fs from 'fs/promises';
import { storeMessage, escapeMarkdown, readMessageIds } from './helpers';

const bot = new TelegramBot(telegramBotToken);

interface Product {
  date: string;
  result?: { title: string; newPrice: string; matched: string };
  price?: { price: string; cost: string; profit: string; roi?: string };
  productUrl: string;
  desiredPrice: number;
  monitorEnabled: boolean;
}

interface Result {
  title: string;
  newPrice: string;
  matched: string;
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
  if (telegramBotToken && telegramUserId) {
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
  }
  return null;
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

const calculateNewProfitAndROI = ({
  price,
  cost,
  profit,
  priceFloat,
}: any) => {
  const fees = parseFloat(price) - parseFloat(cost) - parseFloat(profit);
  const newProfit = priceFloat - parseFloat(cost) - fees;
  const newROI = (newProfit / parseFloat(cost)) * 100;

  return {
    newProfit: newProfit.toFixed(2) || null,
    newROI: newROI.toFixed(2) || null,
  };
};

const productMonitor = async (product: Product, data: Product[]) => {
  const { productUrl, desiredPrice, monitorEnabled, price } = product;
  const today = new Date().toISOString().split('T')[0];
  let botResponse = null;

  try {
    if (monitorEnabled == false) {
      console.info('Product monitoring is disabled.');
      return;
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

    let { newProfit, newROI } = calculateNewProfitAndROI({
      ...price,
      priceFloat,
    });

    newProfit = newProfit || ''
    newROI = newROI || ''

    const profitEmoji = parseFloat(newProfit ?? '0') >= 1.5 ? '🟢' : parseFloat(newProfit ?? '0') >= 1 ? '🟠' : '🔴';
    const roiEmoji = parseFloat(newROI ?? '0') >= 25 ? '🟢' : parseFloat(newROI ?? '0') >= 20 ? '🟠' : '🔴';

    // Create or update the product in the data
    const updatedProduct: Product = {
      productUrl,
      desiredPrice,
      monitorEnabled: true,
      date: today,
      result,
      price,
    };

    const existingProductIndex = data.findIndex(
      (p: Product) => p.productUrl === productUrl
    );
    if (existingProductIndex !== -1) {
      // Update the existing product
      data[existingProductIndex] = updatedProduct;
    } else {
      // Add the new product to the data
      data.push(updatedProduct);
    }
    await updateProductData(data);
    console.info(`Product: \`${title}\ ${profitEmoji}-${roiEmoji}`)

    const escapedProfit = escapeMarkdown(newProfit);
    const escapedPrice = escapeMarkdown(newPrice);
    const escapedROI = escapeMarkdown(newROI);
    const escapedTitle = escapeMarkdown(title);;

    const message = `
        *Product:* [${escapedTitle}](${productUrl})
        *Current Price:* ${escapedPrice}
        *Profit:* £ ${escapedProfit} ${profitEmoji}
        *ROI:* ${escapedROI} ${roiEmoji}
    `;

    botResponse = await sendTelegramMessage(message);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.log(product)
      storeMessage(FileName.Error, JSON.stringify({product}));
      console.error('Error:', error.message);
    }
  }
  return botResponse;
};

export const handler = async () => {
  const messageIds = await readMessageIds()
  messageIds && await deleteMessages(messageIds)

  let response = null;
  try {
    const shortDateTime = new Date().toLocaleString('en-UK', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const stars = `\\*\\*\\*\\*`
    await sendTelegramMessage(
      `${stars} *PRODUCT UPDATE* ${shortDateTime} ${stars}`
    );

    const data = await getProductData();

    for (const product of data) {
      const result = await productMonitor(product, data);
      response = result;
      // Delay between sending messages
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await sendTelegramMessage(
      `${stars} *FINISHED*\\! ${shortDateTime} ${stars}`
    );

  } catch (error) {
    console.error('Error reading the data file:', error);
  }
  return response;
};

(async () => {
  await handler();
})();
