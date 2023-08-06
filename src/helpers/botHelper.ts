import TelegramBot from 'node-telegram-bot-api';
import { telegramBotToken, telegramUserId, FileName } from '../../config';
import { storeMessage } from './fileHelper'

const bot = new TelegramBot(telegramBotToken);

export const sendTelegramMessage = async (message: string) => {
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

export const deleteTelegramMessages = async (messageIds: number[]): Promise<void> => {
    try {
      for (const messageId of messageIds) {
        await bot.deleteMessage(telegramUserId, messageId);
        console.info(`Deleted message with ID: ${messageId}`);
      }
  
      const newMessageIds = messageIds.filter(id => !messageIds.includes(id));
      storeMessage(FileName.Message, newMessageIds.join('\n'));
    } catch (error) {
      console.error('Error deleting messages:', error);
    }
  };
