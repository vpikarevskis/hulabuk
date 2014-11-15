(function(app) {
	app.controller('mainAppCtrl', ['$scope', '$http', '$window', '$q', 'blockUI', 'dataSvc', function($scope, $http, $window, $q, blockUI, dataSvc){
		$window.viewportUnitsBuggyfill.init();

		$scope.cityLocationId = '9B0681E3-6D9F-47E8-8E14-5389F83569DD';
		$scope.locationData = {
			'9B0681E3-6D9F-47E8-8E14-5389F83569DD': {'country': 'FR', 'city': 'Paris'},
			'CA62CF56-3490-467B-B531-99D1956120C4': {'country': 'IT', 'city': 'Rome'}};

		$scope.regions = [];
		$scope.markers = [];
		$scope.hiddenHotels = [];
		$scope.regionColors = ['#27ae60', '#2ecc71', '#f1c40f', '#f39c12', '#e67e22', '#d35400', '#e74c3c', '#c0392b'];
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
					$scope.applyFilters();
				}
		};

		$scope.rateSliderOptions = {
				'range': true,
				'change': function(event, ui){
					$scope.applyFilters();
				}
		};

		$scope.$watch('requests', function(newValue, oldValue){
			if (newValue == 0){
				var jumbotronBlock = blockUI.instances.get('jumbotronBlock');
				if (jumbotronBlock.state().blockCount > 0){
					jumbotronBlock.stop();
				}
				$scope.showHotelList = true;
				$scope.mapLoaded = true;
			}
		});

		$scope.loadMarkers = function(region){
			dataSvc.getRegionHotels(region.region_id, $scope.selectedRange.start, $scope.selectedRange.end, $scope.stars[0], $scope.stars[1], $scope.rates[0], $scope.rates[1]).then(function(response){
				var data = response.data;
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
				if (newMarkers.length > 0){
					var cutOffNumber = Math.floor(newMarkers.length * 0.05);
					var minRate = newMarkers[cutOffNumber].average;
					var maxRate = newMarkers[newMarkers.length - cutOffNumber - 1].average;
					var rateStep = (maxRate - minRate) / 8;
					if (rateStep == 0){
						rateStep = 1;
					}
				}

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
					marker.shown = true;
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
			dataSvc.getCalendar($scope.locationData[$scope.cityLocationId].city, $scope.locationData[$scope.cityLocationId].country).then(function(response) {
				var data = response.data;
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

			var maxRate = $scope.rates[1] == 500 ? "" : "&maxRate=" + $scope.rates[1];
			var jumbotronBlock = blockUI.instances.get('jumbotronBlock');

			jumbotronBlock.start("Getting best hotels for you...");
			$scope.requests = 2;

			$scope.hotelsById = {};

			dataSvc.getRegions($scope.locationData[$scope.cityLocationId].city, $scope.locationData[$scope.cityLocationId].country, $scope.selectedRange.start, $scope.selectedRange.end).then(function(responseRegions){
				var minRegionRate = Number.MAX_VALUE;
				var maxRegionRate = 0;
				var latitude = 0;
				var longitude = 0;
				var coordCount = 0;
				var dataRegions = responseRegions.data;
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
					region.coloring = {color: $scope.regionColors[buc], width: 0, opacity: 0.5};
					region.hide = false;
					region.events = {
						click: function(){
							$scope.loadMarkers(region)},
						mouseover: function(){
							region.coloring.opacity = 0.7;
						},
						mouseout: function(){
							region.coloring.opacity = 0.5;
						}
					};
				});
			
				$scope.regions = dataRegions.result;
				$scope.requests--;
			});
			
			dataSvc.getHotels($scope.locationData[$scope.cityLocationId].city, $scope.locationData[$scope.cityLocationId].country, $scope.selectedRange.start, $scope.selectedRange.end, $scope.stars[0], $scope.stars[1], $scope.rates[0], $scope.rates[1]).then(function(responseHotels){
				var data = responseHotels.data;
				angular.forEach(data.result, function(hotel, index){
					hotel.icon = '/images/markers/marker-blue.png';
					hotel.stars = new Array(parseInt(hotel.stars));
					hotel.shown = false;
					hotel.bookingUrl = "";
					hotel.loading = true;
					$scope.hotelsById[hotel.hotel_id] = hotel;
				});

				$scope.hotels = data.result;

				if ($scope.hotels.length  > 0){
					$scope.requests++;
					var suppliedHotels = $scope.hotels;
					if (suppliedHotels.length == 1) {
						suppliedHotels = [suppliedHotels];
					}
					dataSvc.getPricing($scope.selectedRange.start, $scope.selectedRange.end, suppliedHotels, $scope.customerSessionId).then(function(response){
						dataPricing = response.data;
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
						$scope.requests--;
					});
				}

				$scope.moreResultsAvailable = $scope.hotels.length > 0;
				$scope.page = data.page;
				while ($scope.markers.length > 0) { $scope.markers.pop(); }
				$scope.requests--;
			});
		};

		$scope.applyFilters = function() {
			$scope.sliderChangeCount++;
			if ($scope.sliderChangeCount <= 8){
				return;
			}

			if ($scope.blocking){
				$scope.canceller.resolve();
			}
			
			$scope.blocking = true;

			var arrivalDate = $scope.selectedRange.start.format("YYYY-MM-DD");
			var departureDate = $scope.selectedRange.end.format("YYYY-MM-DD");
			var maxRate = $scope.rates[1] == 500 ? "" : "&maxRate=" + $scope.rates[1];
			$scope.canceller = $q.defer();
			$scope.hotelsById = {};

			
			dataSvc.getHotels($scope.locationData[$scope.cityLocationId].city, $scope.locationData[$scope.cityLocationId].country, $scope.selectedRange.start, $scope.selectedRange.end, $scope.stars[0], $scope.stars[1], $scope.rates[0], $scope.rates[1]).then(function(response){
				var data = response.data;
				angular.forEach(data.result, function(hotel, index){
					hotel.icon = '/images/markers/marker-blue.png';
					hotel.stars = new Array(parseInt(hotel.stars));
					hotel.shown = false;
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
					var suppliedHotels = $scope.hotels;
					if (suppliedHotels.length == 1) {
						suppliedHotels = [suppliedHotels];
					}
					dataSvc.getPricing($scope.selectedRange.start, $scope.selectedRange.end, suppliedHotels, $scope.customerSessionId).then(function(response){
						var dataPricing = response.data;
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

				$scope.moreResultsAvailable = $scope.hotels.length > 0;
				$scope.page = data.page;
				$scope.selectedHotel = false;
				$scope.resetMap();
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

			if ($scope.blocking){
				$scope.canceller.resolve();
			}

			$scope.blocking = true;
			$scope.canceller = $q.defer();
			dataSvc.getHotels($scope.locationData[$scope.cityLocationId].city, $scope.locationData[$scope.cityLocationId].country, $scope.selectedRange.start, $scope.selectedRange.end, $scope.stars[0], $scope.stars[1], $scope.rates[0], $scope.rates[1], $scope.page + 1).then(function(response){
				var data = response.data;
				$scope.moreResultsAvailable = data.result.length > 0;
				if (!$scope.moreResultsAvailable){
					$scope.blocking = false;
					return;
				}

				angular.forEach(data.result, function(hotel, index){
					hotel.icon = '/images/markers/marker-blue.png';
					hotel.stars = new Array(hotel.stars);
					hotel.shown = false;
					hotel.bookingUrl = "";
					$scope.loading = true;
					$scope.hotelsById[hotel.hotel_id] = hotel;
				});

				$scope.hotels = $scope.hotels.concat(data.result);
				var suppliedHotels = $scope.hotels;
					if (suppliedHotels.length == 1) {
						suppliedHotels = [suppliedHotels];
					}
					dataSvc.getPricing($scope.selectedRange.start, $scope.selectedRange.end, suppliedHotels, $scope.customerSessionId).then(function(response){
						var dataPricing = response.data;
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
			while ($scope.markers.length > 0) { $scope.markers.pop().shown = false; }
			angular.forEach($scope.regions, function(region){
				region.hide = false;
			});
		};

		$scope.mouseOverHotelListing = function(hotel) {
			hotel.old_icon = hotel.icon;
			hotel.icon = '/images/markers/marker-blue.png';
			if (!hotel.shown){
				$scope.markers.push(hotel);
			}
		};

		$scope.mouseLeaveHotelListing = function(hotel) {
			hotel.icon = hotel.old_icon;
			if (!hotel.shown){
				$scope.markers.splice($scope.markers.indexOf(hotel));
			}
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
			var suppliedHotels = $scope.hotels;
			if (suppliedHotels.length == 1) {
				suppliedHotels = [suppliedHotels];
			}
			dataSvc.getPricing($scope.selectedRange.start, $scope.selectedRange.end, suppliedHotels, $scope.customerSessionId).then(function(response){
				var dataPricing = response.data;
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
			while ($scope.regions.length > 0) { $scope.regions.pop(); }
			while ($scope.markers.length > 0) { $scope.markers.pop(); }
			$scope.showHotelList = false;
			$scope.selectedHotel = false;
		};

		$scope.setLocation = function(locationId)
		{
			$scope.cityLocationId = locationId;
			$scope.loadCalendar();
		};
	}]);
})(angular.module('sharikiApp'));