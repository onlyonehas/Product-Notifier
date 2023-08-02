****************************************************************
To save costs and some other reasons, 
We are planning to run this application locally.

Running cron job 5-8 daily, but this would mean if laptop is off
no updates will be received.

For this reasons, we are storing the file locally in json format
This may change to s3 or google sheets.

For async Telegram Bot updates, webhook with domain is required 
Otherwise polling needs to be done.

Exploring affordable servers that can use webhook for replies.

****************************************************************

// TODO
- REFACTOR code to follow DRY concept
- move functions into helpers and make prooduct-notifier more readable
- get weather forecast for upcoming weeks/month
- filter result alphabetically or by greens 
- easier method of adding new products
- easier method of re-running only specific product
