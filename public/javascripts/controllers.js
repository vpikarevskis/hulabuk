var sharikiApp = angular.module('sharikiApp', ['ui.slider', 'dateRangePicker', 'google-maps', 'blockUI']);

sharikiApp.config(function(	blockUIConfigProvider){
	blockUIConfigProvider.autoBlock(false);
	blockUIConfigProvider.delay(1);
});

sharikiApp.controller('MainAppCtrl', function($scope, $location, $http, $timeout, $window, $q, blockUI){
	$window.viewportUnitsBuggyfill.init();

	$scope.cityLocationId = '9B0681E3-6D9F-47E8-8E14-5389F83569DD';
	$scope.locationData = {
		'9B0681E3-6D9F-47E8-8E14-5389F83569DD': {'country': 'FR', 'city': 'Paris'},
		'CA62CF56-3490-467B-B531-99D1956120C4': {'country': 'IT', 'city': 'Rome'}};

	$scope.markers = [];
	$scope.hiddenHotels = [];
	$scope.regionColors = [{color: '#27ae60', width: 0, opacity: 0.5}, {color: '#2ecc71', width: 0, opacity: 0.5}, {color: '#f1c40f', width: 0, opacity: 0.5}, {color: '#f39c12', width: 0, opacity: 0.5}, {color: '#e67e22', width: 0, opacity: 0.5}, {color: '#d35400', width: 0, opacity: 0.5}, {color: '#e74c3c', width: 0, opacity: 0.5}, {color: '#c0392b', width: 0, opacity: 0.5}];
	$scope.icons = ['/images/markers/marker-nephritis.png', '/images/markers/marker-emerald.png', '/images/markers/marker-sunflower.png', '/images/markers/marker-orange.png', '/images/markers/marker-carrot.png', '/images/markers/marker-pumpkin.png', '/images/markers/marker-alizarin.png', '/images/markers/marker-pomegranate.png'];
	$scope.stars = [0, 5];
	$scope.rates = [0, 500];
	$scope.sliderChangeCount = 0;
	$scope.showHotelList = false;
	$scope.selectedHotel = false;

	$scope.map = {
	    center: {
	        latitude: 45,
	        longitude: -73
	    },
	    zoom: 12,
	    draggable: true,
	    control: {},
	    options: {mapTypeControl: false, streetViewControl: false},
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

			if ($scope.blocking){
				$scope.canceller.resolve();
				$scope.blocking = false;
			}
			
			$scope.blocking = true;
			$scope.seeHotels();
		}
	};

	$scope.loadMarkers = function(region){
		$http.get('/data/regional-list?region=' + region.region_id + '&arrivalDate=' + $scope.selectedRange.start.format("YYYY-MM-DD") + '&departureDate=' + $scope.selectedRange.end.format("YYYY-MM-DD")).success(function(data){
			angular.forEach(data.result, function(marker, index){
				if (marker.hotel_id in $scope.hotelsById){
					data.result[index] = $scope.hotelsById[marker.hotel_id];
				} else {
					marker.average = parseFloat(marker.average);
					marker.stars = new Array(parseInt(marker.stars));
				}
			});

			var newMarkers = $scope.markers.concat(data.result);
			newMarkers.sort(function(firstMarker, secondMarker){
				if (firstMarker.average < secondMarker.average){
					return -1;
				} else if (firstMarker.average > secondMarker.average) {
					return 1;
				}
				return 0;
			});
			var cutOffNumber = Math.floor(newMarkers.length * 0.05);
			var minRate = newMarkers[cutOffNumber].average;
			var maxRate = newMarkers[newMarkers.length - cutOffNumber - 1].average;
			var rateStep = (maxRate - minRate) / 8;
			console.log(newMarkers);
			console.log(newMarkers.length);
			console.log(cutOffNumber);
			console.log(minRate);
			console.log(maxRate);
			console.log(rateStep);

			angular.forEach(data.result, function(marker){
				marker.onClicked = function(){
					$scope.selectHotel(marker);
				};
				var buc = Math.floor((marker.average - minRate) / rateStep);

				if (buc >= 8){
					buc = 7;
				} else if (buc < 0) {
					buc = 0;
				}
				marker.icon = $scope.icons[buc];
			});

			angular.forEach($scope.markers, function(marker){
				var buc = Math.floor((marker.average - minRate) / rateStep);
				if (buc >= 8){
					buc = 7;
				} else if (buc < 0) {
					buc = 0;
				}
				marker.icon = $scope.icons[buc];
			});

			region.hide = true;
			$scope.markers = newMarkers;
		});
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

			$scope.calendarAverages = calendarAverages;
		});
	};

	$scope.loadCalendar();

	$scope.seeHotels = function(){
		if ($scope.selectedRange === undefined)
		{
			return;
		}

		var arrivalDate = $scope.selectedRange.start.format("YYYY-MM-DD");
		var departureDate = $scope.selectedRange.end.format("YYYY-MM-DD");
		var maxRate = $scope.rates[1] == 500 ? "" : "&maxRate=" + $scope.rates[1];
		var jumbotronBlock = blockUI.instances.get('jumbotronBlock');

		if (!$scope.blocking){
			jumbotronBlock.start("Getting best hotels for you...");
		}
		
		$scope.canceller = $q.defer();
		$scope.hotelsById = {};
		
		if ($scope.lastLocation != $scope.cityLocationId){
			$scope.lastLocation = $scope.cityLocationId;
			$http.get("/data/regions?country=" + $scope.locationData[$scope.cityLocationId].country + "&city=" + $scope.locationData[$scope.cityLocationId].city + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate).success(function(dataRegions){
				var minRegionRate = Number.MAX_VALUE;
				var maxRegionRate = 0;
				var latitude = 0;
				var longitude = 0;
				var coordCount = 0;
				angular.forEach(dataRegions.result, function(region){
					if (minRegionRate > region.average){
						minRegionRate = region.average;
					}
					if (maxRegionRate < region.average){
						maxRegionRate = region.average;
					}
					var coordinatesString = region.coordinates.split(":");
					var coordinates = new Array(coordinatesString.length);
					angular.forEach(coordinatesString, function(coordinatesPair, index){
						var ll = coordinatesPair.split(";");
						coordinates[index] = {latitude: ll[0], longitude: ll[1]};
						latitude += parseFloat(ll[0]);
						longitude += parseFloat(ll[1]);
						coordCount++;
					});
					region.coordinates = coordinates;
				});
				latitude /= coordCount;
				longitude /= coordCount;
				$scope.map.center = {latitude: latitude, longitude: longitude};

				var rateStep = (maxRegionRate - minRegionRate) / 8;
				angular.forEach(dataRegions.result, function(region){
					var buc = Math.floor((region.average - minRegionRate) / rateStep);
					if (buc == 8){
						buc = 7;
					}
					region.coloring = $scope.regionColors[buc];
					region.hide = false;
					region.onClicked = function(){
						$scope.loadMarkers(region);
					};
				});

				$scope.regions = dataRegions.result;
			});
		} else { 
			angular.forEach($scope.regions, function(region){
				region.hide = false;
			});
		}

		$http.get("/data/list?country=" + $scope.locationData[$scope.cityLocationId].country + "&city=" + $scope.locationData[$scope.cityLocationId].city + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate + "&minStarRating=" + $scope.stars[0] + "&maxStarRating=" + $scope.stars[1] + "&minRate=" + $scope.rates[0] + maxRate, {timeout: $scope.canceller ? $scope.canceller.promise : undefined}).success(function(data){
			$scope.hotelIdList = "";
			angular.forEach(data.result, function(hotel, index){
				hotel.icon = '/images/markers/marker-green.png';
				hotel.stars = new Array(parseInt(hotel.stars));
				hotel.bookingUrl = "";
				hotel.loading = true;
				$scope.hotelsById[hotel.hotel_id] = hotel;
				$scope.hotelIdList += hotel.hotel_id;
				if (index < data.result.length - 1){
					$scope.hotelIdList += ",";
				}
			});
			$scope.hotels = data.result;

			if ($scope.hotels.length  > 0){
				var sessionId = $scope.customerSessionId === undefined ? "" : "&customerSessionId=" + $scope.customerSessionId;
				$http.get("/data/pricing?arrivalDate=" + $scope.selectedRange.start.format("MM/DD/YYYY") + "&departureDate=" + $scope.selectedRange.end.format("MM/DD/YYYY") + "&hotelIdList=" + $scope.hotelIdList + sessionId, {timeout: $scope.canceller ? $scope.canceller.promise : undefined}).success(function(dataPricing){
					if (dataPricing.HotelListResponse.EanWsError === undefined){
						if (dataPricing.HotelListResponse.HotelList.HotelSummary.length === undefined){
							dataPricing.HotelListResponse.HotelList.HotelSummary = [dataPricing.HotelListResponse.HotelList.HotelSummary];
						}
						angular.forEach(dataPricing.HotelListResponse.HotelList.HotelSummary, function(hotel){
							$scope.hotelsById[hotel.hotelId].bookingUrl = $scope.constructUrl($scope.hotelsById[hotel.hotelId], hotel.RoomRateDetailsList, hotel.supplierType);
							$scope.hotelsById[hotel.hotelId].average = hotel.RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@averageRate"];
							$scope.hotelsById[hotel.hotelId].priceUpdated = true;
						});
					}

					angular.forEach(data.result, function(hotel){
						hotel.loading = false;
						hotel.loaded = true;
					});
					$scope.customerSessionId = dataPricing.HotelListResponse.customerSessionId;
				});
			}

			if ($scope.blocking){
				$scope.blocking = false;
			}

			if (jumbotronBlock.state().blockCount > 0){
				jumbotronBlock.stop();
			}

			$scope.markers = [];
			$scope.moreResultsAvailable = $scope.hotels.length > 0;
			$scope.page = data.page;
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

		var arrivalDate = $scope.selectedRange.start.format("YYYY-MM-DD");
		var departureDate = $scope.selectedRange.end.format("YYYY-MM-DD");
		var maxRate = $scope.rates[1] == 500 ? "" : "&maxRate=" + $scope.rates[1];

		$scope.blocking = true;
		$scope.canceller = $q.defer();
		
		$http.get("/data/list?country=" + $scope.locationData[$scope.cityLocationId].country + "&city=" + $scope.locationData[$scope.cityLocationId].city + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate + "&minStarRating=" + $scope.stars[0] + "&maxStarRating=" + $scope.stars[1] + "&minRate=" + $scope.rates[0] + "&page=" + ($scope.page + 1) + maxRate , {timeout: $scope.canceller.promise}).success(function(data){

			$scope.moreResultsAvailable = data.result.length > 0;
			if (!$scope.moreResultsAvailable){
				$scope.blocking = false;
				return;
			}

			$scope.hotelIdList = "";

			angular.forEach(data.result, function(hotel, index){
				hotel.icon = '/images/markers/marker-green.png';
				hotel.stars = new Array(hotel.stars);
				hotel.bookingUrl = "";
				$scope.loading = true;
				$scope.hotelsById[hotel.hotel_id] = hotel;
				$scope.hotelIdList += hotel.hotel_id;
				if (index < data.result.length - 1){
					$scope.hotelIdList += ",";
				}
			});
			$scope.hotels = $scope.hotels.concat(data.result);
			var sessionId = "&customerSessionId=" + $scope.customerSessionId;
			$http.get("/data/pricing?arrivalDate=" + $scope.selectedRange.start.format("MM/DD/YYYY") + "&departureDate=" + $scope.selectedRange.end.format("MM/DD/YYYY") + "&hotelIdList=" + $scope.hotelIdList + sessionId, {timeout: $scope.canceller ? $scope.canceller.promise : undefined}).success(function(dataPricing){
					if (dataPricing.HotelListResponse.EanWsError === undefined){
						if (dataPricing.HotelListResponse.HotelList.HotelSummary.length === undefined){
							dataPricing.HotelListResponse.HotelList.HotelSummary = [dataPricing.HotelListResponse.HotelList.HotelSummary];
						}
						angular.forEach(dataPricing.HotelListResponse.HotelList.HotelSummary, function(hotel){
							$scope.hotelsById[hotel.hotelId].bookingUrl = $scope.constructUrl($scope.hotelsById[hotel.hotelId], hotel.RoomRateDetailsList, hotel.supplierType);
							$scope.hotelsById[hotel.hotelId].average = hotel.RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@averageRate"];
							$scope.hotelsById[hotel.hotelId].priceUpdated = true;
						});
					}

					angular.forEach(data.result, function(hotel){
						hotel.loading = false;
						hotel.loaded = true;
					});
				});

			$scope.page = data.page;
			$scope.blocking = false;
		});

	};

	$scope.resetMap = function(){
		$scope.minRate = Number.MAX_VALUE;
		$scope.maxRate = 0;
		$scope.markers = [];
		angular.forEach($scope.regions, function(region){
			region.hide = false;
		});
	};

	$scope.mouseOverHotelListing = function(hotel) {
		hotel.old_icon = hotel.icon;
		hotel.icon = '/images/markers/marker-blue.png';
	};

	$scope.mouseLeaveHotelListing = function(hotel) {
		hotel.icon = hotel.old_icon;
	};

	$scope.constructUrl = function(hotel, RoomRateDetailsList, supplierType){
		return "https://www.travelnow.com/templates/459180/hotels/" + hotel.hotel_id +
			"/book?lang=en" +
			"&currency=GBP" +
			"&standardCheckin=" + $scope.selectedRange.start.format("MM/DD/YYYY") +
			"&standardCheckout=" + $scope.selectedRange.end.format("MM/DD/YYYY") +
			"&roomsCount=1" +
			"&rooms[0].adultsCount=" + RoomRateDetailsList.RoomRateDetails.quotedRoomOccupancy +
			"&rooms[0].childrenCount=0" +
			"&hotelId=" + hotel.hotel_id +
			"&rateCode=" + RoomRateDetailsList.RoomRateDetails.rateCode +
			"&roomTypeCode=" + RoomRateDetailsList.RoomRateDetails.roomTypeCode + 
			"&rateKey=" + RoomRateDetailsList.RoomRateDetails.rateKey +
			"&selectedPrice=" + RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@total"] +
			"&supplierType=" + supplierType;
	};

	$scope.unSelectHotel = function(){
		$scope.hotels = $scope.hiddenHotels;
		$scope.selectedHotel = false;
	};

	$scope.selectHotel = function(hotel){
		hotel.bookingUrl = "";
		$scope.hotelIdList = hotel.hotel_id;
		$scope.canceller = $q.defer();
		var sessionId = "&customerSessionId=" + $scope.customerSessionId;
		if (!$scope.selectedHotel){
			$scope.hiddenHotels = $scope.hotels;
		}

		$scope.hotels = [hotel];
		$scope.selectedHotel = true;
		$scope.$apply();
		if (hotel.priceUpdated){
			return;
		}
		hotel.loading = true;
		$http.get("/data/pricing?arrivalDate=" + $scope.selectedRange.start.format("MM/DD/YYYY") + "&departureDate=" + $scope.selectedRange.end.format("MM/DD/YYYY") + "&hotelIdList=" + $scope.hotelIdList + sessionId, {timeout: $scope.canceller ? $scope.canceller.promise : undefined}).success(function(dataPricing){
			if (dataPricing.HotelListResponse.EanWsError === undefined){
				if (dataPricing.HotelListResponse.HotelList.HotelSummary.length === undefined){
					dataPricing.HotelListResponse.HotelList.HotelSummary = [dataPricing.HotelListResponse.HotelList.HotelSummary];
				}
				angular.forEach(dataPricing.HotelListResponse.HotelList.HotelSummary, function(hotel){
					$scope.hotels[0].bookingUrl = $scope.constructUrl($scope.hotels[0], hotel.RoomRateDetailsList, hotel.supplierType);
					$scope.hotels[0].average = hotel.RoomRateDetailsList.RoomRateDetails.RateInfo.ChargeableRateInfo["@averageRate"];
					$scope.hotels[0].priceUpdated = true;
				});
			}
			$scope.hotels[0].loading = false;
			$scope.hotels[0].loaded = true;
		});
	};

	$scope.edit = function(){
		if ($scope.blocking){
			$scope.blocking = false;
			$scope.canceller.resolve();
		}
		$scope.showHotelList = false;
		$scope.hotels = [];
	};

	$scope.setLocation = function(locationId)
	{
		$scope.cityLocationId = locationId;
		$scope.loadCalendar();
	};
});