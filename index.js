const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const port = 4000;

app.use(cors());

app.get('/player-counts', async (req, res) => {
	try {
		res.status(200).send('Connected to server!');
	} catch (error) {
		res.status(500).send('Error connecting to server.');
	}
});

app.listen(port, () => {
	console.log(`Node server running at http://localhost:${port}`);
});
