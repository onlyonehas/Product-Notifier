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
import { extractASIN, promptSelect } from './helpers/promptHelper';
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

const calculateNewProfitAndROI = (originalPriceInfo: Price, latestPrice: number): { latestProfit: string; latestROI: string } => {
  const { price, cost, profit } = originalPriceInfo;
  const fees = parseFloat(price) - parseFloat(cost) - parseFloat(profit);
  const latestProfit = (latestPrice - parseFloat(cost) - fees).toFixed(2) || '0';
  const latestROI = (((latestPrice - parseFloat(cost) - fees) / parseFloat(cost)) * 100).toFixed(2) || '0';

  return {
    latestProfit,
    latestROI,
  };
};

const processProduct = async (product: ProductData, data: ProductData[]): Promise<null | object> => {
  const { productUrl, saUrl, desiredPrice, monitorEnabled, price } = product;
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
    const priceElement = $('.a-offscreen').first().text().trim();
    const latestPrice = parseFloat(priceElement.replace('£', ''));
    const matched = latestPrice >= desiredPrice ? '✅' : '❌';

    const result: ExtractedData = {
      title,
      latestPrice: priceElement,
      matched,
    };

    const originalPriceInfo = {
      price: price.price,
      cost: price.cost,
      profit: price.profit,
    };

    const { latestProfit, latestROI } = calculateNewProfitAndROI(originalPriceInfo, latestPrice);

    const profitEmoji = parseFloat(latestProfit ?? '0') >= 1.5 ? '🟢' : parseFloat(latestProfit ?? '0') >= 1 ? '🟠' : '🔴';
    const roiEmoji = parseFloat(latestROI ?? '0') >= 25 ? '🟢' : parseFloat(latestROI ?? '0') >= 20 ? '🟠' : '🔴';

    const asin = saUrl ?? extractASIN(productUrl) as string[]
    const saLink = asin[1] && `https://sas.selleramp.com/sas/lookup?SasLookup%5Bsearch_term%5D=${asin[1]}`
    let getSaUrl = saUrl ?? saLink

    const updatedProduct: ProductData = {
      productUrl,
      saUrl: getSaUrl,
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

    const escapedProfit = escapeMarkdown(latestProfit);
    const escapedPrice = escapeMarkdown(priceElement);
    const escapedROI = escapeMarkdown(latestROI);
    const escapedTitle = escapeMarkdown(title);

    const message = `
      *Product:* [${escapedTitle}](${getSaUrl})
      *Current Price:* ${escapedPrice} *Desired Price:* ${matched}
      *Profit:* £ ${escapedProfit} ${profitEmoji} *ROI:* ${escapedROI} ${roiEmoji}
    `;

    botResponse = await sendTelegramMessage(message);
    counter++;
  } catch (error: unknown) {
    if (error instanceof Error) {
      storeMessage(FileName.Error, JSON.stringify(product, null, 2) + ",");
      console.error('Error:', error.message);
    }
  }
  return botResponse;
};

export const handler = async () => {
  let response: null | object = null;
  try {
    const shortDateTime = new Date().toLocaleString('en-UK', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const data = await getProductData();
    const allOption = 'All products';
    const products = data.map((product, index) => ({ ...product, id: index }));

    const reprocessChoice = await promptSelect(
      'Select which products to reprocess:',
      [allOption, ...products.map(product => product.result?.title || '')]
    );

    const containsAll = reprocessChoice.includes(allOption)

    if (containsAll) {
      const messageIds = await readMessageIds();
      if (messageIds.length > 1) {
        await deleteTelegramMessages(messageIds);
      }
    }
    const stars = `\\*\\*\\*\\*`;
    await sendTelegramMessage(`${stars} *PRODUCT UPDATE* ${shortDateTime} ${stars}`);

    const productsToProcess = containsAll
      ? data
      : reprocessChoice.map((choice) => {
        const matchingProduct = products.find((product) => product.result?.title === choice);
        if (matchingProduct) {
          return matchingProduct;
        } else {
          console.error('Invalid choice:', choice);
          return null;
        }
      });

    for (const product of productsToProcess) {
      if (product !== null) {
        const result = await processProduct(product, data);
        response = result;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    console.info(`Finished: ${shortDateTime}`);
    await sendTelegramMessage(`${stars} *${counter}/${data.length}  FINISHED*\\! ${shortDateTime} ${stars}`);
  } catch (error) {
    console.error('Error reading the data file:', error);
  }
  return response;
};

(async () => {
  await handler();
})();
