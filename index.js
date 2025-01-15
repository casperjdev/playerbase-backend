const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const port = 4000;

app.use(cors());

// Service #1: Top games on Steam
app.get('/player-counts', async (req, res) => {
	try {
		const browser = await puppeteer.launch({ headless: true });
		const page = await browser.newPage();

		await page.goto('https://steamcharts.com/top');

		const gameData = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('table#top-games tbody tr'));
			return rows.map((row) => ({
				name: row.querySelector('td:nth-child(2) a')?.innerText.trim(),
				playerCount: row.querySelector('td:nth-child(3)')?.innerText.trim(),
			}));
		});

		await browser.close();

		res.json(gameData);
	} catch (error) {
		console.error('Error:', error.message);
		res.status(500).send('Error scraping Steam Charts');
	}
});

app.listen(port, () => {
	console.log(`Node server running at http://localhost:${port}`);
});
