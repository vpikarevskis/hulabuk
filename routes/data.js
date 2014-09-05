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
var validator = require('validator');

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

router.get('/signup', function(req, res) {
	if (validator.isEmail(req.query.email)){
		pg.connect(conString, function(err, client, done) {
			client.query('INSERT INTO signups (email, date) VALUES ($1, $2)', [req.query.email, moment()], function(err, result) {
				done();
				res.json(200, {'valid': true});
			})
		});
	} else {
		res.json(200, {'valid': false});
	}
});

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

router.get('/pricing', function(req, res) {
	var options = {
		'customerIpAddress': req.ip,
		'customerUserAgent': req.headers['user-agent'],
		'HotelListRequest': {
			'RoomGroup': {
				'Room': {
					'numberOfAdults': '2',
					'numberOfChildren': '0'
				}
			}
		}
	};

	options.customerSessionId = req.query.customerSessionId === undefined ? cc.generate() : req.query.customerSessionId;
	
	options.HotelListRequest.hotelIdList = req.query.hotelIdList === undefined ? '191243' : req.query.hotelIdList;

	options.HotelListRequest.arrivalDate = req.query.arrivalDate === undefined ? moment().add('months', 1).format('MM/DD/YYYY') : req.query.arrivalDate;
	options.HotelListRequest.departureDate = req.query.departureDate === undefined ? moment().add('months', 1).add('days', 7).format('MM/DD/YYYY') : req.query.departureDate;

	expedia.hotels.list(options, function(err, expediaRes){
		if(err)throw new Error(err);
		res.send(expediaRes);
	});
});

router.get('/regions', function(req, res) {
	if (!(req.query.country in countryData)) {
		res.json(200, {'error': 'this country does not exist'});
		return;
	} else if (countryData[req.query.country].indexOf(req.query.city) < 0) {
		res.json(200, {'error': 'this city does not exist'});
		return;
	}
	var country = req.query.country;
	var city = req.query.city;

	var arrivalDate = req.query.arrivalDate === undefined ? moment().add('months', 1).format('YYYY-MM-DD') : req.query.arrivalDate;
	var departureDate = req.query.departureDate === undefined ? moment().add('months', 1).add('days', 7).format('YYYY-MM-DD') : req.query.departureDate;

	queryString = 'SELECT region_range_averages.region_id, region_range_averages.average, city_region_items.coordinates FROM region_range_averages JOIN city_region_items ON region_range_averages.region_id = city_region_items.region_id WHERE city_region_items.country = $1 AND city_region_items.city = $2 AND region_range_averages.check_in_date = $3 AND region_range_averages.check_out_date = $4';
	queryParameters = [country, city, arrivalDate, departureDate];

	pg.connect(conString, function(err, client, done) {
		client.query(queryString, queryParameters, function(err, result) {
			done();
			res.json(200, {'result': result === undefined ? [] : result.rows});
		})
	});
});

router.get('/regional-list', function(req, res) {
	if (req.query.region === undefined) {
		res.json(200, {'error': 'no region specified'});
		return;
	}

	var arrivalDate = req.query.arrivalDate === undefined ? moment().add('months', 1).format('YYYY-MM-DD') : req.query.arrivalDate;
	var departureDate = req.query.departureDate === undefined ? moment().add('months', 1).add('days', 7).format('YYYY-MM-DD') : req.query.departureDate;

	var minStarRating = req.query.minStarRating === undefined ? 0 : req.query.minStarRating;
	var maxStarRating = req.query.maxStarRating === undefined ? 5 : req.query.maxStarRating;
	var minRate = req.query.minRate === undefined ? 0 : req.query.minRate;
	var regionId = req.query.region;

	if (req.query.maxRate !== undefined){
		var maxRate = req.query.maxRate;
		var queryParameters = [regionId, minStarRating, maxStarRating, arrivalDate, departureDate, minRate, maxRate];
		var queryString = 'SELECT room_range_averages.hotel_id, room_range_averages.room_id, room_range_averages.average, hotel_items.hotel_name, hotel_items.stars, hotel_items.longitude, hotel_items.latitude, image_items.url FROM room_range_averages JOIN hotel_items ON room_range_averages.hotel_id = hotel_items.id JOIN image_items ON room_range_averages.hotel_id = image_items.hotel_id JOIN region_hotel_mapping ON room_range_averages.hotel_id = region_hotel_mapping.hotel_id WHERE region_hotel_mapping.region_id = $1 AND hotel_items.stars BETWEEN $2 AND $3 AND room_range_averages.check_in_date = $4 AND room_range_averages.check_out_date = $5 AND room_range_averages.average BETWEEN $6 AND $7 AND room_range_averages.cheapest_room = \'t\' AND image_items.default_image = \'t\'';
	} else {
		var queryParameters = [regionId, minStarRating, maxStarRating, arrivalDate, departureDate, minRate];
		var queryString = 'SELECT room_range_averages.hotel_id, room_range_averages.room_id, room_range_averages.average, hotel_items.hotel_name, hotel_items.stars, hotel_items.longitude, hotel_items.latitude, image_items.url FROM room_range_averages JOIN hotel_items ON room_range_averages.hotel_id = hotel_items.id JOIN image_items ON room_range_averages.hotel_id = image_items.hotel_id JOIN region_hotel_mapping ON room_range_averages.hotel_id = region_hotel_mapping.hotel_id WHERE region_hotel_mapping.region_id = $1 AND hotel_items.stars BETWEEN $2 AND $3 AND room_range_averages.check_in_date = $4 AND room_range_averages.check_out_date = $5 AND room_range_averages.average >= $6 AND room_range_averages.cheapest_room = \'t\' AND image_items.default_image = \'t\'';
	}

	pg.connect(conString, function(err, client, done) {
		client.query(queryString, queryParameters, function(err, result) {
			done();
			res.json(200, {'result': result === undefined ? [] : result.rows});
		});
	});
});


router.get('/list', function(req, res) {
	var page = req.query.page === undefined || isNaN(parseInt(req.query.page)) ? 0 : parseInt(req.query.page);
	if (!(req.query.country in countryData)) {
		res.json(200, {'error': 'this country does not exist'});
		return;
	} else if (countryData[req.query.country].indexOf(req.query.city) < 0) {
		res.json(200, {'error': 'this city does not exist'});
		return;
	}
	var country = req.query.country;
	var city = req.query.city;

	var arrivalDate = req.query.arrivalDate === undefined ? moment().add('months', 1).format('YYYY-MM-DD') : req.query.arrivalDate;
	var departureDate = req.query.departureDate === undefined ? moment().add('months', 1).add('days', 7).format('YYYY-MM-DD') : req.query.departureDate;

	var minStarRating = req.query.minStarRating === undefined ? 0 : req.query.minStarRating;
	var maxStarRating = req.query.maxStarRating === undefined ? 5 : req.query.maxStarRating;
	var minRate = req.query.minRate === undefined ? 0 : req.query.minRate;

	if (req.query.maxRate !== undefined){
		var maxRate = req.query.maxRate;
		var queryParameters = [country, city, minStarRating, maxStarRating, arrivalDate, departureDate, minRate, maxRate, page * 20];
		var queryString = 'SELECT room_range_averages.hotel_id, room_range_averages.room_id, room_range_averages.average, hotel_items.hotel_name, hotel_items.stars, hotel_items.longitude, hotel_items.latitude, image_items.url FROM room_range_averages JOIN hotel_items ON room_range_averages.hotel_id = hotel_items.id JOIN image_items ON room_range_averages.hotel_id = image_items.hotel_id WHERE hotel_items.country = $1 AND hotel_items.city = $2 AND hotel_items.stars BETWEEN $3 AND $4 AND room_range_averages.check_in_date = $5 AND room_range_averages.check_out_date = $6 AND room_range_averages.average BETWEEN $7 AND $8 AND room_range_averages.cheapest_room = \'t\' AND image_items.default_image = \'t\' OFFSET $9 LIMIT 20';
	} else {
		var queryParameters = [country, city, minStarRating, maxStarRating, arrivalDate, departureDate, minRate, page * 20];
		var queryString = 'SELECT room_range_averages.hotel_id, room_range_averages.room_id, room_range_averages.average, hotel_items.hotel_name, hotel_items.stars, hotel_items.longitude, hotel_items.latitude, image_items.url FROM room_range_averages JOIN hotel_items ON room_range_averages.hotel_id = hotel_items.id JOIN image_items ON room_range_averages.hotel_id = image_items.hotel_id WHERE hotel_items.country = $1 AND hotel_items.city = $2 AND hotel_items.stars BETWEEN $3 AND $4 AND room_range_averages.check_in_date = $5 AND room_range_averages.check_out_date = $6 AND room_range_averages.average >= $7 AND room_range_averages.cheapest_room = \'t\' AND image_items.default_image = \'t\' OFFSET $8 LIMIT 20';
	}

	pg.connect(conString, function(err, client, done) {
		client.query(queryString, queryParameters, function(err, result) {
			done();
			res.json(200, {'result': result === undefined ? [] : result.rows, 'page': page});
		});
	});
});


module.exports = router;
