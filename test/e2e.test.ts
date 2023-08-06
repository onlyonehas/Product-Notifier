import request from 'supertest';
import { handler } from "../src/telegramBot"


describe.skip('End-to-End Telegram-Bot Test: /edit', () => {
  it('should edit the product', async () => {
    // Set up the test event
    const editEvent = {
      body: JSON.stringify({
        message: {
          text: '/edit',
        },
      }),
    };

    // Execute the handler function
    const response = await request(handler)
      .post('/edit')
      .send(editEvent);

    // Assert the response status code
    expect(response.statusCode).toEqual(200);

    // Assert the response body
    expect(response.body).toEqual('OK');

    // Perform additional assertions based on the Telegram bot responses
    expect(response.text).toContain('Please enter the product URL to edit:');
    expect(response.text).toContain('Please enter the new price:');
    // Add more assertions as needed
  });
});
