import { handler } from "../src/telegram-bot"

describe.skip('Telegram Bot', () => {
    const event = {
        body: JSON.stringify({
            message: {
                text: '/get'
            }
        })
    };
    test('should return list of products on /get', async () => {
        const result = await handler(event)
        console.log(result)
        expect(result).toBeTruthy;
    })
    test('should add new product on /add', async () => {
        const addEvent = {
            ...event, body: JSON.stringify({
                message: {
                    text: '/add https://example.com/product, 99.99',
                }
            })
        }

        const result = await handler(addEvent)
        console.log(result)
        expect(result).toBeTruthy;
    })
    test('should edit product on /edit', async () => {
        const editEvent = {
            ...event, body: JSON.stringify({
                message: {
                    text: '/edit',
                }
            })
        }

        const result = handler(editEvent);
        expect(result).toBeTruthy;
    })
})

/* 
todo: mock s3 data  
use this sample for now
  const data = [
      {
        productUrl: 'https://www.amazon.co.uk/dp/B09CHXHQRB',
        desiredPrice: 27,
        monitorEnabled: true,
        date: '2023-06-10',
        result: { title: 'NERF Legends (PS5)', price: '£24.98', matched: '❌' }
      },
      {
        productUrl: 'https://www.amazon.co.uk/dp/B085FQHP4H',
        desiredPrice: 28.84,
        monitorEnabled: true,
        date: '2023-06-10',
        result: {
          title: 'Biotherm Homme 72H Day Control Extreme Protection Non-Stop Anti-Perspirant Roll-On 2 x 75ml',
          price: '£27.16',
          matched: '❌'
        }
      },
    ]
*/
