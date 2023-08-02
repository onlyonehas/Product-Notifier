import * as fs from 'fs/promises';

export const storeMessage = async (fileName: string, message: any): Promise<void> => {
    try {
        await fs.appendFile(fileName, `${message}\n`);
    } catch (err) {
        console.error('Error storing message ID:', err);
    }
};

export const readMessageIds = async (): Promise<number[]> => {
    try {
        const data = await fs.readFile('message_ids.txt', 'utf-8');
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
