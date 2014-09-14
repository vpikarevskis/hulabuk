var express = require('express');
var pg = require('pg').native;
pg.defaults.poolSize = 5;

var squel = require('squel');

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
			var query = squel.insert({ numberedParameters: true }).into('signups').set('email', req.query.email).set('date', moment().format()).toParam();
			client.query(query.text, query.values, function(err, result) {
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
	var s = squel.select({ numberedParameters: true });
	s = s.field('to_char(date, \'MM/DD/YYYY\')', 'date').field('average').from('daily_averages').where('country = ?', req.query.country).where('city = ?', req.query.city).where('date >= ?', yesterday);

	query = s.toParam();
	pg.connect(conString, function(err, client, done) {
		client.query(query.text, query.values, function(err, result) {
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

	var s = squel.select({ numberedParameters: true });
	s = s.field('region_range_averages.region_id').field('region_range_averages.average').field('city_region_items.coordinates');
	s = s.from('region_range_averages').join('city_region_items', null, 'region_range_averages.region_id = city_region_items.region_id');
	s = s.where('city_region_items.country = ?', country).where('city_region_items.city = ?', city).where('region_range_averages.check_in_date = ?', arrivalDate).where('region_range_averages.check_out_date = ?', departureDate);

	query = s.toParam();
	pg.connect(conString, function(err, client, done) {
		client.query(query.text, query.values, function(err, result) {
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

	var s = squel.select({ numberedParameters: true });
	s = s.field('room_range_averages.hotel_id').field('room_range_averages.room_id').field('room_range_averages.average').field('hotel_items.hotel_name').field('hotel_items.stars').field('hotel_items.longitude').field('hotel_items.latitude').field('image_items.url');
	s = s.from('room_range_averages').join('hotel_items', null, 'room_range_averages.hotel_id = hotel_items.id').join('image_items', null, 'room_range_averages.hotel_id = image_items.hotel_id').join('region_hotel_mapping', null, 'room_range_averages.hotel_id = region_hotel_mapping.hotel_id');
	s = s.where('room_range_averages.cheapest_room = \'t\'').where('image_items.default_image = \'t\'').where('region_hotel_mapping.region_id = ?', regionId).where('room_range_averages.check_in_date = ?', arrivalDate).where('room_range_averages.check_out_date = ?', departureDate);
	s = s.where('room_range_averages.average >= ?', minRate);
	if (req.query.maxRate !== undefined){
		s = s.where('room_range_averages.average <= ?'. req.query.maxRate);
	}
	if (minStarRating != 0) {
		s = s.where('hotel_items.stars >= ?', minStarRating);
	}
	s = s.where('hotel_items.stars <= ?', maxStarRating);

	query = s.toParam();
	pg.connect(conString, function(err, client, done) {
		client.query(query.text, query.values, function(err, result) {
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

	var s = squel.select({ numberedParameters: true });
	s = s.field('room_range_averages.hotel_id').field('room_range_averages.room_id').field('room_range_averages.average').field('hotel_items.hotel_name').field('hotel_items.stars').field('hotel_items.longitude').field('hotel_items.latitude').field('image_items.url');
	s = s.from('room_range_averages').join('hotel_items', null, 'room_range_averages.hotel_id = hotel_items.id').join('image_items', null, 'hotel_items.id = image_items.hotel_id');
	s = s.where('room_range_averages.cheapest_room = \'t\'').where('image_items.default_image = \'t\'');
	s = s.where('hotel_items.country = ?', country).where('hotel_items.city = ?', city);
	s = s.where('room_range_averages.check_in_date = ?', arrivalDate).where('room_range_averages.check_out_date = ?', departureDate);
	if (minStarRating != 0){
		s = s.where('hotel_items.stars >= ?', minStarRating);
	}
	s = s.where('hotel_items.stars <= ?', maxStarRating);
	s = s.where('room_range_averages.average >= ?', minRate);
	if (req.query.maxRate !== undefined){
		s = s.where('room_range_averages.average <= ?', req.query.maxRate);
	}
	s = s.offset(page * 20).limit(20);

	query = s.toParam();
	pg.connect(conString, function(err, client, done) {
		client.query(query.text, query.values, function(err, result) {
			done();
			res.json(200, {'result': result === undefined ? [] : result.rows, 'page': page});
		});
	});
});

module.exports = router;
