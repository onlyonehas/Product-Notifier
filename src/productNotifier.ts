import { load } from 'cheerio';
import { FileName } from '../config';
import axios from 'axios';
import {
  storeMessage,
  escapeMarkdown,
  readMessageIds,
  getProductData,
  updateProductData
} from './helpers/fileHelper';
import { sendTelegramMessage, deleteTelegramMessages } from './helpers/botHelper';
import { promptSelect } from './helpers/promptHelper';
import { ProductData, ExtractedData, Price } from './sharedTypes/Product';

let counter = 0;

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

const processProduct = async (product: ProductData, data: ProductData[]): Promise<null | object> => {
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

    const result: ExtractedData = {
      title,
      newPrice,
      matched,
    };

    const { newProfit, newROI } = calculateNewProfitAndROI(price);

    const profitEmoji = parseFloat(newProfit ?? '0') >= 1.5 ? '🟢' : parseFloat(newProfit ?? '0') >= 1 ? '🟠' : '🔴';
    const roiEmoji = parseFloat(newROI ?? '0') >= 25 ? '🟢' : parseFloat(newROI ?? '0') >= 20 ? '🟠' : '🔴';

    const updatedProduct: ProductData = {
      productUrl,
      desiredPrice,
      monitorEnabled: true,
      date: today,
      result,
      price,
    };

    const existingProductIndex = data.findIndex((p: ProductData) => p.productUrl === productUrl);
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
    await deleteTelegramMessages(messageIds);
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
