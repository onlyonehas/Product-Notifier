const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const scrapeIt = (productUrl) => {
  // Read the existing data from the JSON file
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync('data.json'));
  } catch (error) {
    console.error('Error reading the data file:', error);
  }

  // Check if the URL has already been scraped today
  const today = new Date().toISOString().split('T')[0];
  if (data[productUrl] && data[productUrl].date === today) {
    const result = data[productUrl].result;
    console.log('Scraped data already exists for today:');
    console.log(result);
    return;
  }

  axios.get(productUrl)
    .then(response => {
      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('#productTitle').text().trim();
        const price = $('.a-offscreen').first().text().trim();

        const result = {
          title: title,
          price: price
        };

        // Update the data object with the new scraped result
        data[productUrl] = {
          date: today,
          result: result
        };

        // Write the updated data object to the JSON file
        fs.writeFileSync('data.json', JSON.stringify(data));

        console.log('Scraped data:');
        console.log(result);
      } else {
        console.error('Error: ' + response.status);
      }
    })
    .catch(error => {
      console.error('Error: ' + error.message);
    });
};

// Usage example
const productUrls = [
  'https://www.amazon.co.uk/dp/B09CHXHQRB',
  'https://www.amazon.co.uk/dp/ANOTHER_PRODUCT_URL',
  'https://www.amazon.co.uk/dp/YET_ANOTHER_PRODUCT_URL'
];

productUrls.forEach(productUrl => {
  scrapeIt(productUrl);
});
