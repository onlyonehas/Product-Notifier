import * as fs from 'fs/promises';
import { createInterface } from 'readline';

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

const prompt = async (question: string): Promise<string> => {
    const readline = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        readline.question(question, (answer: string) => {
            readline.close();
            resolve(answer);
        });
    });
};


export const promptSelect = async (
    question: string,
    options: string[]
): Promise<string[]> => {
    console.info(question);
    for (let i = 0; i < options.length; i++) {
        console.info(`${i + 1}. ${options[i]}`);
    }

    let selectedIndicesInput;
    do {
        selectedIndicesInput = await prompt(
            'Enter the numbers of the options you want to select (comma-separated): '
        );
    } while (!selectedIndicesInput);

    const selectedIndices = selectedIndicesInput
        .split(',')
        .map((index) => index.trim());

    const selectedOptions = selectedIndices.map(
        (index) => options[parseInt(index) - 1]
    );

    return selectedOptions;
};