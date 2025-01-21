const { JSDOM } = require('jsdom'); // Importujemy JSDOM
const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const app = express();
const PORT = 4000; // Port, na którym serwer będzie nasłuchiwał

// Middleware - pozwalamy na obsługę JSON i włączamy CORS
app.use(express.json());
app.use(cors());

async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			let totalHeight = 0;
			const distance = 200;
			const timer = setInterval(() => {
				const scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				if (totalHeight >= scrollHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

// Endpoint GET
app.get('/', async (req, res) => {
	let browser;

	try {
		// Uruchomienie przeglądarki Puppeteer
		browser = await puppeteer.launch({
			args: ['--no-sandbox', '--disable-setuid-sandbox'],
		});

		// Otwarcie nowej strony
		const page = await browser.newPage();

		// Pobranie parametru name z zapytania lub ustawienie domyślnej wartości
		const searchQuery = req.query.name ? encodeURIComponent(req.query.name) : 'obuwie';

		// Zbieranie danych z butosklep.pl
		await page.goto(`https://butosklep.pl/search.php?text=${searchQuery}`);

		await page.setViewport({
			width: 1920,
			height: 1080,
		});

		await autoScroll(page);
		const butosklep = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('.product'));
			return rows.map((row) => ({
				name: row.querySelector('img')?.alt || null,
				img: row.querySelector('img')?.src || null,
				price: row.querySelector('.price')?.textContent?.trim().split('zł')[0] + 'zł' || null,
				href: row.querySelector('a.product__icon')?.href || null,
			}));
		});

		// Zbieranie danych z Moliera
		await page.goto(`https://www.moliera2.com/product/index?q=${searchQuery}`);

		await page.setViewport({
			width: 1920,
			height: 1080,
		});

		await autoScroll(page);

		const moliera = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('.item'));
			return rows.map((row) => ({
				name: row.querySelector('img')?.alt || null,
				img: row.querySelector('img')?.src || null,
				price: row.querySelector('.price-widget > div')?.textContent?.trim() || null,
				href: row.querySelector('a.product-list-item-a')?.href || null,
			}));
		});

		// Zbieranie danych z ccc.eu
		await page.goto(
			`https://ccc.eu/pl/search?query[menu_item]=sr_&query[querystring]=${searchQuery}`
		);
		await page.waitForSelector('.snrs-product');

		await page.setViewport({
			width: 1920,
			height: 1080,
		});

		await autoScroll(page);

		const ccc = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('.snrs-product'));
			return rows.map((row) => ({
				name: row.querySelector('img')?.alt || null,
				img: row.querySelector('img')?.src || null,
				price: row.querySelector('.a-price > div > span')?.textContent?.trim() || null,
				href: row.querySelector('a.a-typo')?.href || null,
			}));
		});

		// Filtrowanie wyników, aby usunąć puste nazwy w każdej grupie danych
		const filteredData = {
			butosklep: butosklep.filter((item) => item.name),
			moliera: moliera.filter((item) => item.name),
			ccc: ccc.filter((item) => item.name),
		};

		// Zamknięcie przeglądarki
		await browser.close();

		// Zwrócenie wyników jako JSON
		res.json(filteredData);
	} catch (error) {
		console.error('Błąd servera:', error);

		// Wysyłamy odpowiedź o błędzie
		res.status(500).send('Wystąpił błąd podczas scrapowania strony.');
	} finally {
		// Zawsze zamykamy przeglądarkę
		if (browser) {
			await browser.close();
		}
	}
});

// Uruchamiamy serwer
app.listen(PORT, () => {
	console.log(`Serwer działa na porcie http://localhost:${PORT}`);
});
