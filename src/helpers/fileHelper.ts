import * as fs from 'fs/promises';
import { ProductData } from '../sharedTypes/Product';
import { FileName } from '../../config';

export const storeMessage = async (fileName: string, message: any): Promise<void> => {
  try {
    await fs.appendFile(fileName, `${message}\n`);
  } catch (err) {
    console.error('Error storing message ID:', err);
  }
};

export const storeNewMessage = async (fileName: string, message: any): Promise<void> => {
  try {
    await fs.writeFile(fileName, `${message}\n`);
  } catch (err) {
    console.error('Error storing message ID:', err);
  }
};

export const readMessageIds = async (): Promise<number[]> => {
  try {
    const data = await fs.readFile(FileName.Message, 'utf-8');
    const messageIds = data.trim().split('\n').map(Number);
    return messageIds;
  } catch (err) {
    console.error('Error reading message IDs:', err);
    return [];
  }
};

export const escapeMarkdown = (text: string) => {
  return text.replace(/[_*[\]()~`>#+-=|{}!]/g, '\\$&');
}

// json
export const getProductData = async (): Promise<ProductData[]> => {
  try {
    const jsonData = await fs.readFile(FileName.Data, 'utf8');
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('Error reading data file:', error);
    return [];
  }
};

export const updateProductData = async (data: ProductData[]): Promise<void> => {
  try {
    await fs.writeFile(FileName.Data, JSON.stringify(data));
  } catch (error) {
    console.error('Error updating data file:', error);
  }
};