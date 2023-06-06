import * as TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import { telegramBotToken, telegramUserId } from '../config';

export const handler = async (event: any): Promise<any> => {
  const bot = new TelegramBot(telegramBotToken);

  const message = JSON.parse(event.body);
  const text = message.message.text;

  if (text?.startsWith('/add')) {
    const input = text.split(' ')[1];
    if (input) {
      const [productUrl, desiredPrice] = input.split(',');

      const product = {
        productUrl,
        desiredPrice,
        monitorEnabled: true
      };

      try {
        const rawData = fs.readFileSync('data.json', 'utf8');
        const products = JSON.parse(rawData);

        // Check if the product already exists
        const existingProduct = products.find((p: any) => p.name === name);
        if (existingProduct) {
          await bot.sendMessage(telegramUserId, 'Product already exists.');
        } else {
          products.push(product);
          fs.writeFileSync('data.json', JSON.stringify(products));
          await bot.sendMessage(telegramUserId, 'Product added successfully!');
        }
      } catch (error) {
        console.error(error);
        await bot.sendMessage(telegramUserId, 'An error occurred while adding the product.');
      }
    } else {
      await bot.sendMessage(telegramUserId, 'Please enter the product details.');
    }
  } else if (text?.startsWith('/get')) {
    // Read data from data.json file or database
    // You can use any method to read from a file or database of your choice

    try {
      const rawData = fs.readFileSync('data.json', 'utf8');
      const products = JSON.parse(rawData);

      let response = 'Products:\n';
      for (const product of products) {
        response += `Name: ${product.name}\nPrice: ${product.price}\nDescription: ${product.description}\n\n`;
      }

      await bot.sendMessage(telegramUserId, response);
    } catch (error) {
      console.error(error);
      await bot.sendMessage(telegramUserId, 'An error occurred while retrieving products.');
    }
  } else if (text?.startsWith('/edit')) {
    const input = text.split(' ')[1];
    if (input) {
      const [name, field, value] = input.split(',');

      try {
        const rawData = fs.readFileSync('data.json', 'utf8');
        const products = JSON.parse(rawData);

        // Find the product by name
        const product = products.find((p: any) => p.name === name);
        if (product) {
          // Update the desired field
          if (field === 'producturl') {
            product.producturl = value;
          } else if (field === 'desiredprice') {
            product.desiredprice = value;
          }

          fs.writeFileSync('data.json', JSON.stringify(products));
          await bot.sendMessage(telegramUserId, 'Product updated successfully!');
        } else {
          await bot.sendMessage(telegramUserId, 'Product not found.');
        }
      } catch (error) {
        console.error(error);
        await bot.sendMessage(telegramUserId, 'An error occurred while updating the product.');
      }
    } else {
      await bot.sendMessage(telegramUserId, 'Please provide the product name and field to edit.');
    }
  }

  return {
    statusCode: 200,
    body: 'OK',
  };
};
