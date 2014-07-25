var sharikiApp = angular.module('sharikiApp', ['ui.bootstrap', 'ui.slider', 'dateRangePicker', 'google-maps', 'blockUI']);

sharikiApp.config(function(blockUIConfigProvider){
	blockUIConfigProvider.message("Loading best rates...");
	blockUIConfigProvider.delay(1);
});

sharikiApp.directive("resize", function ($window) {
	return function (scope, element) {
		var w = angular.element($window);
		scope.$watch(function () {
			return { "h": w.height(), "w": w.width() };
		}, function (newValue, oldValue) {
		}, true);

		angular.element(".hotel-list").height(angular.element(".hotel-list").parent().height() - angular.element(".filters").height());

		w.bind("resize", function () {
			scope.$apply();
		});
	}
});

sharikiApp.controller('FeedbackCtrl', function($scope, $http) {
	$scope.feedbackSuccess = true;
	$scope.feedbackMessage = null;

	$scope.submitAttempted = false;

	$scope.submissionConfig = new Object();
	$scope.submissionConfig.method = "POST";
	$scope.submissionConfig.url = "/data/feedback";
	$scope.submissionConfig.responseType = "json";
	
	$scope.stars = [1, 1, 1, 1, 0];
	$scope.starsSum = 4;

	$scope.updateStars = function(index){
		$scope.starsSum = 0;
		for (var i = 0; i < $scope.stars.length; i++)
		{
			if (i <= index)
			{
				$scope.stars[i] = 1;
				$scope.starsSum += 1;
			}
			else
			{
				$scope.stars[i] = 0;
			}

		}
	}

	$scope.submitFeedback = function(){

		$scope.submitAttempted = true;
		if ($scope.feedbackForm.email.$invalid)
		{
			return;
		}

		var stars = 0;

		$scope.submissionConfig.data = JSON.stringify({
			email: $scope.fromEmail,
			stars: $scope.starsSum,
			features: $scope.features,
			good: $scope.good,
			better: $scope.better
		});

		$http($scope.submissionConfig).success(function(data, status){
			$scope.feedbackSuccess = true;
			$scope.feedbackMessage = "Your feedback has been sent!"
		}).error(function(data, status){
			$scope.feedbackSuccess = false;
			$scope.feedbackMessage = "Sorry, failure occured.";

		});
	};

	$scope.range = function(num) {
    	return new Array(num);   	
	};

});


sharikiApp.controller('RoomListCtrl', function($scope, $http, $timeout, $window, $log, blockUI){
	$window.viewportUnitsBuggyfill.init();

	$scope.cityLocationId = '9B0681E3-6D9F-47E8-8E14-5389F83569DD';
	$scope.locationData = {
		'9B0681E3-6D9F-47E8-8E14-5389F83569DD': {'country': 'FR', 'city': 'Paris'},
		'CA62CF56-3490-467B-B531-99D1956120C4': {'country': 'IT', 'city': 'Rome'}};
	$scope.stars = [0, 5];
	$scope.rates = [0, 500];
	$scope.hotelOrder = "PRICE";
	$scope.sliderChangeCount = 0;
	$scope.showHotelList = false;
	$scope.selectedHotel = false;

	$scope.map = {
	    center: {
	        latitude: 45,
	        longitude: -73
	    },
	    zoom: 8,
	    draggable: true,
	    control: {}
	};

	$scope.starSliderOptions = {
			'range': true,
			'change': function(event, ui){
				$scope.sliderChange();
			}
	};

	$scope.rateSliderOptions = {
			'range': true,
			'change': function(event, ui){
				$scope.sliderChange();
			}
	};

	$scope.sliderChange = function(){
		$scope.sliderChangeCount++;
		if ($scope.sliderChangeCount > 8){
			$scope.seeHotels();
		}
	};

	$scope.loadCalendar = function(){
		$http.get('/data/calendar?city=' + $scope.locationData[$scope.cityLocationId].city + '&country=' + $scope.locationData[$scope.cityLocationId].country).success(function(data){
			var minRate =  Number.MAX_VALUE;
			var maxRate = 0;
			var calendarAverages = {};
			angular.forEach(data.result, function(average){
				if (minRate > average.average){
					minRate = average.average;
				}

				if (maxRate < average.average){
					maxRate = average.average;
				}

				calendarAverages[average.date] = average;
			});

			var rateStep = (maxRate - minRate) / 8;

			angular.forEach(data.result, function(average){
				average.buc = Math.floor((average.average - minRate) / rateStep);
			});

			$scope.minRate = minRate;
			$scope.rateStep = rateStep;
			$scope.calendarAverages = calendarAverages;
		});
	};

	$scope.loadCalendar();

	$scope.selectHotel = function(hotel){
		$scope.selectedHotel = hotel;
		$scope.$apply();
	};

	$scope.seeHotels = function(){
		if ($scope.selectedRange === undefined)
		{
			return;
		}

		var arrivalDate = $scope.selectedRange.start.format("MM/DD/YYYY");
		var departureDate = $scope.selectedRange.end.format("MM/DD/YYYY");
		var maxRate = $scope.rates[1] == 500 ? "" : "&maxRate=" + $scope.rates[1];

		blockUI.start();

		$http.get("/data/list?destinationId=" + $scope.cityLocationId + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate + "&minStarRating=" + $scope.stars[0] + "&maxStarRating=" + $scope.stars[1] + "&minRate=" + $scope.rates[0] + maxRate + "&order=" + $scope.hotelOrder).success(function(data){
			$scope.moreResultsAvailable = data.HotelListResponse.moreResultsAvailable;
			$scope.cacheKey = data.HotelListResponse.cacheKey;
			$scope.cacheLocation = data.HotelListResponse.cacheLocation;
			$scope.customerSessionId = data.HotelListResponse.customerSessionId;
			angular.forEach(data.HotelListResponse.HotelList.HotelSummary, function(hotel){
				hotel.onClicked = function(){
					$scope.selectHotel(hotel);
				};
			});
			$scope.hotels = data.HotelListResponse.HotelList.HotelSummary;
			blockUI.stop();
			$scope.selectedHotel = false;
			$scope.showHotelList = true;
			$scope.mapLoaded = true;
		});
	};

	$scope.loadMore = function() {
		if (!$scope.moreResultsAvailable)
		{
			return;
		}

		blockUI.start();
		
		$http.get("/data/page?cacheKey=" + $scope.cacheKey + "&cacheLocation=" + $scope.cacheLocation + "&customerSessionId=" + $scope.customerSessionId).success(function(data){
			if (data.HotelListResponse.EanWsError !== undefined){
				$scope.moreResultsAvailable = false;
				blockUI.stop();
				return;
			}

			$scope.moreResultsAvailable = data.HotelListResponse.moreResultsAvailable;
			angular.forEach(data.HotelListResponse.HotelList.HotelSummary, function(hotel){
				hotel.onClicked = function(){
					$scope.selectHotel(hotel);
				};
			});
			$scope.hotels = $scope.hotels.concat(data.HotelListResponse.HotelList.HotelSummary);

			if ($scope.moreResultsAvailable)
			{
				$scope.cacheKey = data.HotelListResponse.cacheKey;
				$scope.cacheLocation = data.HotelListResponse.cacheLocation;
			}
			else
			{
				delete $scope.cacheKey;
				delete $scope.cacheLocation;
			}

			blockUI.stop();
		});

	};

	$scope.constructPicture = function(hotel){
		return "http://images.travelnow.com" + hotel.thumbNailUrl.slice(0, hotel.thumbNailUrl.length - 5) + "l.jpg";
	}

	$scope.constructURL = function(hotel){
		return "https://www.travelnow.com/templates/459180/hotels/" + hotel.hotelId +
				"/book?lang=en" +
				"&currency=GBP" +
				"&standardCheckin=" + $scope.selectedRange.start.format("MM/DD/YYYY") +
				"&standardCheckout=" + $scope.selectedRange.end.format("MM/DD/YYYY") +
				"&roomsCount=1" +
				"&rooms[0].adultsCount=" + hotel.RoomRateDetailsList.RoomRateDetails.quotedRoomOccupancy +
				"&rooms[0].childrenCount=0" +
				"&hotelId=" + hotel.hotelId +
				"&rateCode=" + hotel.RoomRateDetailsList.RoomRateDetails.rateCode +
				"&roomTypeCode=" + hotel.RoomRateDetailsList.RoomRateDetails.roomTypeCode + 
				"&rateKey=" + hotel.RoomRateDetailsList.RoomRateDetails.rateKey +
				"&selectedPrice=" + hotel.RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@total"] +
				"&supplierType=" + hotel.supplierType;
	};

	$scope.filterHotel = function(hotel){
		return !$scope.selectedHotel ? true : hotel.hotelId === $scope.selectedHotel.hotelId;
	};

	$scope.sortHotel = function(hotel){
		return hotel.RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@averageRate"];
	};

	$scope.decodeXML = function(string){
		return string.replace(/&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/&gt;/g, '>')
		.replace(/&lt;/g, '<')
		.replace(/&amp;/g, '&');
	};

	$scope.edit = function(){
		$scope.showHotelList = false;
		$scope.selectedRange = {};
	};

	$scope.setLocation = function(locationId)
	{
		$scope.cityLocationId = locationId;
		$scope.loadCalendar();
	};

	$scope.range = function(num) {
    	return new Array(num);   	
	};

	$scope.controllerLoaded = true;
});