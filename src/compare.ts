import * as puppeteer from 'puppeteer';
import { perScent } from '../config';


const login = async (page: puppeteer.Page) => {
    // Navigate to the login page
    await page.goto('https://www.per-scent.com/Account/SignIn');

    // Enter your login credentials
    await page.type('#gm\\.model\\.loginViewModel\\.username', perScent.username);
    await page.type('#gm\\.model\\.loginViewModel\\.password', perScent.pass);

    // Submit the login form
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const signInButton = buttons.find(element => element.textContent?.includes('Sign in'));
        if (signInButton) {
            signInButton.click();
        }
    });


    // Wait for navigation to complete
    await page.waitForNavigation();
};

const getProductPrice = async (page: puppeteer.Page) => {
    // Get the product price from the product page
    const productPrice = await page.evaluate(() => {
        const priceElement = document.querySelector('.price-h5');
        return priceElement ? priceElement.textContent : null;
    });

    return parseFloat(productPrice!.replace('£', ''));
};

const calculateQuantityToNearest = (amount: number, nearest: number) => {
    // Calculate the quantity needed to reach the nearest amount
    return Math.ceil(amount / nearest);
};

const removeItemsFromBasket = async (page: puppeteer.Page) => {
    // Navigate to the basket page
    await page.goto('https://www.per-scent.com/basket');

    // Remove all items from the basket
    const removeButtons = await page.$$('.remove');
    for (const removeButton of removeButtons) {
        await removeButton.click();
    }
};



const addItemToBasket = async (page: puppeteer.Page, itemUrl: string, quantity: number) => {
    // Navigate to the item page
    await page.goto(itemUrl);

    // Type the quantity into the input field
    await page.type('input[name="productQty"]', quantity.toString());

    // await page.evaluate(() => {
    //     const buttons = Array.from(document.querySelectorAll('button'));
    //     const addButton = buttons.find(element => element.textContent?.includes('Add to Basket'));
    //     if (addButton) {
    //         addButton.click();
    //     }
    // });


    const parentDiv = await page.$('.col-sm-12.col-xs-12');

    if (parentDiv) {
        // Find the button within the parent div
        const addToBasketButton = await parentDiv.$('.btn-primary.col-xs-12.animate.pull-left.m-width-full.cart-add-btn.m-no-margin');

        if (addToBasketButton) {
            // Click the button to add the item to the basket
            for (let i = 0; i < quantity; i++) {
                await addToBasketButton.click();
            }
        }
    };
}

const scrapeWebsite = async () => {
    const browser = await puppeteer.launch({ headless: false }); // Launch the browser in non-headless mode
    const page = await browser.newPage();

    try {
        await login(page);

        const itemUrls = [
            'https://www.per-scent.com/products/aramis-aramis-eau-de-toilette-spray-110ml-330',
            // Add more item URLs here
        ];

        let quantity = 0;

        // Iterate through each item URL
        for (const itemUrl of itemUrls) {
            // Navigate to the product page
            await page.goto(itemUrl);

            // Get the product price
            const productPrice = await getProductPrice(page);
            console.log('Product Price:', productPrice);

            // Calculate the quantity needed to reach the nearest £360
            quantity = calculateQuantityToNearest(productPrice, 360);
            console.log('Quantity:', quantity);

            // Add the calculated quantity to the basket
            await addItemToBasket(page, itemUrl, quantity);
        }

        // Navigate to the checkout page
        await page.goto('https://www.per-scent.com/basket');

        const price = await page.evaluate(() => {
            const priceElement = document.querySelector('.total-price.text-right.no-border');
            return priceElement ? priceElement.textContent : null;
        });

        const finalPrice = parseFloat(price!.replace('£', '')) / quantity;

        const result = {

            finalPrice
        }

        console.log('Final Price:', finalPrice);
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        //   await browser.close();
    }
};

scrapeWebsite();
