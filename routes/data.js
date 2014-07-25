var express = require('express');
var pg = require('pg').native;
pg.defaults.poolSize = 5;

// set up the expedia
var expediaOptions = {
	apiKey: 'qrqf5eh4hfu7xrsqgmqrut8e',
	cid: '55505',
	locale: 'en_US',
	currencyCode: 'GBP'
};
var expedia = require('../node_modules/expedia')(expediaOptions);
var cc = require('../node_modules/coupon-code');
var moment = require('../node_modules/moment');

var conString = '';

if (require('os').hostname() === 'juggs-MacBook-Air.local') {
	conString = 'postgres://jugg@localhost/scrape'
} else if (require('os').hostname() === 'Vadims-Pikarevskiss-Macbook-Pro.local')  {
	conString = 'postgres://vpikarevskis@localhost/scrape'
} else {
	conString = process.env.DATABASE_URL;
}

var router = express.Router();
var countryData = {'FR': ['Paris'], 'IT': ['Rome']};
var yesterday = moment().subtract('1', 'days').format('YYYY-MM-DD');

router.get('/calendar', function(req, res) {
	if (!(req.query.country in countryData)) {
		res.json(200, {'error': 'this country does not exist'});
		return;
	} else if (countryData[req.query.country].indexOf(req.query.city) < 0) {
		res.json(200, {'error': 'this city does not exist'});
		return;
	}

	pg.connect(conString, function(err, client, done) {
		client.query('SELECT to_char(date, \'MM/DD/YYYY\') AS date, average FROM daily_averages WHERE city = $1 AND country = $2 AND date >= $3', [req.query.city, req.query.country, yesterday], function(err, result) {
			done();
			res.json(200, {'result': result.rows});
		})
	});

});


router.get('/list', function(req, res) {
	var options = {
		'customerIpAddress': req.ip,
		'customerUserAgent': req.headers['user-agent'],
		'HotelListRequest': {
			'numberOfResults': '20',
			'RoomGroup': {
				'Room': {
					'numberOfAdults': '2',
					'numberOfChildren': '0'
				}
			}
		}
	};

	options.customerSessionId = req.query.customerSessionId === undefined ? cc.generate() : req.query.customerSessionId;
	
	options.HotelListRequest.destinationId = req.query.destinationId === undefined ? '9B0681E3-6D9F-47E8-8E14-5389F83569DD' : req.query.destinationId;
	options.HotelListRequest.arrivalDate = req.query.arrivalDate === undefined ? moment().add('months', 1).format('MM/DD/YYYY') : req.query.arrivalDate;
	options.HotelListRequest.departureDate = req.query.departureDate === undefined ? moment().add('months', 1).add('days', 7).format('MM/DD/YYYY') : req.query.departureDate;

	options.HotelListRequest.sort = req.query.order === undefined || req.query.order != "PRICE" || req.query.order != "PRICE_REVERSE" ? "PRICE" : req.query.order;
	options.HotelListRequest.minStarRating = req.query.minStarRating === undefined ? 0 : req.query.minStarRating;
	options.HotelListRequest.maxStarRating = req.query.maxStarRating === undefined ? 5 : req.query.maxStarRating;
	options.HotelListRequest.minRate = req.query.minRate === undefined ? 0 : req.query.minRate;

	if (req.query.maxRate !== undefined){
		options.HotelListRequest.maxRate = req.query.maxRate;
	}

	expedia.hotels.list(options, function(err, expediaRes){
		if(err)throw new Error(err);
		res.send(expediaRes);
	});
});

router.get('/page', function(req, res) {
	var options = {
		'customerIpAddress': req.ip,
		'customerUserAgent': req.headers['user-agent'],
		'HotelListRequest': {}
	};

	options.customerSessionId = req.query.customerSessionId === undefined ? cc.generate() : req.query.customerSessionId;
	options.HotelListRequest.cacheKey = req.query.cacheKey === undefined ? 0 : req.query.cacheKey;
	options.HotelListRequest.cacheLocation = req.query.cacheLocation === undefined ? 0 : req.query.cacheLocation;

	expedia.hotels.list(options, function(err, expediaRes){
		if(err)throw new Error(err);
		res.send(expediaRes);
	});
});

module.exports = router;
