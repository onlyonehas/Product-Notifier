import { createInterface } from 'readline';

export const prompt = async (question: string): Promise<string> => {
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

export const extractASIN = (url: string) =>  url.match(/\/dp\/([A-Za-z0-9]+)/);