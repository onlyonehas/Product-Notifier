import TelegramBot from 'node-telegram-bot-api';
import { S3 } from 'aws-sdk';
import { telegramBotToken, telegramUserId, dataBucket } from '../config';

const s3 = new S3();

type Product = {
  productUrl: string;
  desiredPrice: number | string;
  monitorEnabled: boolean;
  date: string;
  result: { title: string; price: string; matched: string; } | null;
};

export const handler = async (event: any): Promise<any> => {
  const bot = new TelegramBot(telegramBotToken);
  const message = JSON.parse(event.body);
  const text = message.message.text;

  const readData = async (): Promise<Product[] | null> => {
    try {
      const jsonData = await s3.getObject(dataBucket).promise();
      return JSON.parse(jsonData.Body?.toString() || '');
    } catch (error) {
      console.error('Error reading data from S3:', error);
      return null;
    }
  };

  const writeData = async (data: Product[]): Promise<void> => {
    try {
      await s3.putObject({ ...dataBucket, Body: JSON.stringify(data) }).promise();
      console.log('Data written to S3 successfully.');
    } catch (error) {
      console.error('Error writing data to S3:', error);
    }
  };

  const addProduct = async (productUrl: string, desiredPrice: string) => {
    const data : Product[] | null = await readData();
    if (data) {
      const existingProduct = data.find((p: Product) => p.productUrl === productUrl);
      if (existingProduct) {
        console.log("existingProduct")

        await bot.sendMessage(telegramUserId, 'Product already exists.');
      } else {
        const product: Product = {
          productUrl,
          desiredPrice: Number(desiredPrice),
          monitorEnabled: true,
          date: new Date().toISOString().split('T')[0],
          result: null,
        };

        data.push(product);
        await writeData(data);
        await bot.sendMessage(telegramUserId, 'Product added successfully!');
      }
    }
  };

  const getProductList = async () => {
    const data = await readData();

    if (data) {
      const now = new Date();
      const date = now.toLocaleDateString();
      const time = now.toLocaleTimeString();

      let response = `**** New Products ${date}${time} *****\n`;
      await bot.sendMessage(telegramUserId, response);

      for (const product of data) {
        const data = `productUrl: ${product.productUrl}\n` +
          `desiredPrice: ${product.desiredPrice}\n` +
          `monitorEnabled: ${product.monitorEnabled}\n` +
          `date: ${product.date}\n` +
          `result: ${JSON.stringify(product.result)}\n\n`;

        await bot.sendMessage(telegramUserId, data);
      }

    }
  };

  const editProduct = async (productUrl: string, price: string) => {
    const data = await readData();
    await bot.sendMessage(telegramUserId, `Editing : ${productUrl} ${price}`);
    if (data) {
      const product = data.find((p: Product) => p.productUrl === productUrl);
      console.log('this is what it found again the url', product)
      if (product) {
        product.desiredPrice = price
        data.push(product);
        // await writeData(data);
        await bot.sendMessage(telegramUserId, 'Product updated successfully!');
      } else {
        await bot.sendMessage(telegramUserId, 'Product not found.');
      }
    }
  };

  const deleteProduct = async (productUrl: string) => {
    const data = await readData();
    if (data) {
      const productIndex = data.findIndex((p: Product) => p.productUrl === productUrl);
      if (productIndex !== -1) {
        data.splice(productIndex, 1);

        await writeData(data);

        await bot.sendMessage(telegramUserId, 'Product deleted successfully!');
      } else {
        await bot.sendMessage(telegramUserId, 'Product not found.');
      }
    }
  };

  switch (true) {
    case text?.startsWith('/add'): {
      await bot.sendMessage(telegramUserId, 'Got it, what product do you want to add e.g productUrl,desiredprice');
      const input = text.replace(',', '').split(' ');
      if (input) {
        const productUrl = input[1];
        const desiredPrice = input[2];

        if (productUrl && desiredPrice) {
          await addProduct(productUrl, desiredPrice);
        } else {
          await bot.sendMessage(telegramUserId, 'Please enter the productUrl,desiredprice');
        }
      } else {
        await bot.sendMessage(telegramUserId, `Input Not Recognised ${text}`);
      }
      break;
    }

    case text?.startsWith('/get'): {
      await getProductList();
      break;
    }

    case text?.startsWith('/edit'): {
      await bot.sendMessage(telegramUserId, 'Please enter the product URL to edit: ');
      bot.once('message', async (reply) => {
        const productUrl = reply.text;
        await bot.sendMessage(telegramUserId, 'Please enter the new price: ');
        bot.once('message', async (reply) => {
          const desiredPrice = reply.text;

          if(productUrl && desiredPrice){
            await editProduct(productUrl, desiredPrice);
          } else {
            await bot.sendMessage(telegramUserId, `Input Not Recognised ${text}`);
            return
          }
        });
      }); 
      break;
    }
    
    case text?.startsWith('/delete'): {
      await bot.sendMessage(telegramUserId, 'what product productUrl do you want to delete?');
      const input = text.split(' ')[1];
      if (input) {
        const productUrl = input.trim();
        if (productUrl) {
          await deleteProduct(productUrl);
        } else {
          await bot.sendMessage(telegramUserId, 'Please provide the productUrl to delete.');
        }
      } else {
        await bot.sendMessage(telegramUserId, 'Please provide the productUrl to delete.');
      }
      break;
    }
    default:
      break;
  }
  return {
    statusCode: 200,
    body: 'OK',
  };
};
