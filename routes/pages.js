var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.render('landing', {title: 'hulabuk'});
});

router.get('/alpha', function(req, res) {
	res.render('main', {title: 'hulabuk'});
});

router.get('/about', function(req, res){
	res.render('about', {title: 'hulabuk'})
});

module.exports = router;
