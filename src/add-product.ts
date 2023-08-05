import * as fs from 'fs/promises';
import { createInterface } from 'readline';
import { FileName } from '../config';

interface PriceInfo {
  cost: string;
  price: string;
  profit: string;
}

interface Product {
  productUrl: string;
  monitorEnabled: boolean;
  date: string;
  price: PriceInfo;
  desiredPrice: number;
}

const prompt = async (question: string): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
};

const getProductUrl = async (): Promise<string> => {
  const productUrl = await prompt('Enter the product URL: ');
  return productUrl;
};

const getProductInfo = async (): Promise<Product> => {
  const productUrl = await getProductUrl();

  const lines: string[] = [];
  console.info('Paste product information (Cost Price, Sale Price, Profit, ROI, Breakeven):');

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  for await (const line of rl) {
    if (line.trim() === '') {
      break;
    } else {
      lines.push(line.trim());
    }
  }

  rl.close();

  const cost = lines[2].replace('£', '').trim();
  const price = lines[5].replace('£', '').trim();
  const profit = lines[7].replace('£', '').trim();
  const currentDate = new Date().toISOString().split('T')[0];

  const desiredPriceInput = await prompt('Enter the desired price (optional): ');
  const desiredPrice = parseFloat(desiredPriceInput) || 0;

  console.info({ cost, price, profit, desiredPrice });

  return {
    productUrl,
    desiredPrice,
    monitorEnabled: true,
    date: currentDate,
    price: {
      cost,
      price,
      profit,
    },
  };
};

const main = async (): Promise<void> => {
  try {
    let shouldAddAnother = true;
    while (shouldAddAnother) {
      const productInfo = await getProductInfo();
      const jsonData = await fs.readFile(FileName.Data, 'utf-8');
      const products: Product[] = JSON.parse(jsonData);
      products.push(productInfo);
      await fs.writeFile('data.json', JSON.stringify(products, null, 2));
      console.log('Product added successfully!\n');

      const addAnother = await prompt('Add another product? (yes/no): ');
      shouldAddAnother = addAnother.toLowerCase() === 'yes';
    }
  } catch (error) {
    console.error('Error adding product:', error);
  }
};

(async () => {
  await main();
})();
