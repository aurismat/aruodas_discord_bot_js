const { EmbedBuilder, WebhookClient } = require('discord.js');
const puppeteer = require('puppeteer-core');
const cron = require('node-cron');

const fs = require('fs');
const path = require('path');

const { webhook_url, embedColor, aruodasURL, listingsDir, chrome_path } = require('./config.json');

// Check if the 'listings' directory exists, create it if necessary
if (!fs.existsSync(listingsDir)) {
	fs.mkdirSync(listingsDir);
}

async function run_browser() {
	const browser = await puppeteer.launch({ headless: 'new', executablePath: chrome_path });
	const page = await browser.newPage();

	await page.goto(aruodasURL);

	await page.waitForSelector('.object-row');

	const rowData = await page.$$eval('.object-row', elements => {
		return elements.map(item => {
			const url = item.querySelector('a').getAttribute('href');
			const hash = url.replace('https://www.aruodas.lt/', '').replace('/', '');
			const listing_data = {
				url: url,
				quartal: item.querySelector('h3').innerText.split('\n')[0].trim(),
				street: item.querySelector('h3').innerText.split('\n')[1].trim(),
				imgurl: item.querySelector('img').getAttribute('src'),
				roomNum: item.querySelector('.list-RoomNum-v2').innerText.trim(),
				price: item.querySelector('.list-item-price-v2').innerText.trim(),
				area: item.querySelector('.list-AreaOverall-v2').innerText.trim(),
				floor: item.querySelector('.list-Floors-v2').innerText.split('/')[0].trim(),
				floors: item.querySelector('.list-Floors-v2').innerText.split('/')[1].trim(),
			};
			return { listing_data, hash };
		});
	});
	await browser.close();

	return rowData;
}

// use this to send webhook messages for any new listings
function sendWebHookText(listing_data) {
	const client = new WebhookClient({ url: webhook_url });
	const title = `${listing_data.quartal}, ${listing_data.street}, ${listing_data.roomNum} kamb. butas`;
	const description = `[Link](${listing_data.url})`;

	const embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setImage(listing_data.imgurl)
		.setColor(embedColor)
		.addFields(
			{ name: 'Kaina', value: listing_data.price, inline: true },
			{ name: 'Plotas', value: listing_data.area + ' ㎡', inline: true },
			{ name: 'Aukštas', value: listing_data.floor + '/' + listing_data.floors, inline: true },
		);

	client.send({
		embeds: [embed],
	});
}

function check_file_exists(hash) {
	const files = fs.readdirSync(listingsDir);
	return files.includes(hash);
}

function create_cache_file(hash) {
	fs.writeFile(path.join(listingsDir, hash), '', (err) => {
		if (err) {
			console.error('Error writing file:', err);
			return;
		}
	});
}

// schedule the task to run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
	run_browser().then(listing_list => {
		listing_list.forEach(listing => {
			if (check_file_exists(listing.hash)) {
				return;
			}
			else {
				console.log(`WRITE: hash '${listing.hash}'`);
				create_cache_file(listing.hash);
				sendWebHookText(listing.listing_data);
				return;
			}
		});
	});
});
