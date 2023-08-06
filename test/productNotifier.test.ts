import { handler } from "../src/productNotifier"

const event = {
    body: JSON.stringify({
        message: {
            text: '/get'
        }
    })
};

describe('Product Notifier', () => {
    test('read the data file, scrape data and display on telegram', async () => {
        const result = await handler()
        console.log(result)
        expect(result).toBeTruthy();
    })
});