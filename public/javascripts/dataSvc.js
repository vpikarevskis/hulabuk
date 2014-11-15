(function(app) {
	app.factory('dataSvc', ['$http', function($http){

		var getRegionHotels = function(regionId, suppliedArrivalDate, suppliedDepartureDate, minStars, maxStars, minRate, maxRate) {
			var arrivalDate = suppliedArrivalDate.format("YYYY-MM-DD");
			var departureDate = suppliedDepartureDate.format("YYYY-MM-DD");
			var maxRate = maxRate == 500 ? "" : "&maxRate=" + maxRate;
			return $http.get('/data/regionHotels?region=' + regionId + '&arrivalDate=' + arrivalDate + '&departureDate=' + departureDate + '&minStarRating=' + minStars + '&maxStarRating=' + maxStars + '&minRate=' + minRate + maxRate);
		};

		var getCalendar = function(city, country) {
			return $http.get('/data/calendar?city=' + city + '&country=' + country);
		};

		var getRegions = function(city, country, suppliedArrivalDate, suppliedDepartureDate) {
			var arrivalDate = suppliedArrivalDate.format("YYYY-MM-DD");
			var departureDate = suppliedDepartureDate.format("YYYY-MM-DD");
			return $http.get("/data/regions?city=" + city + "&country=" + country + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate);
		};

		var getHotels = function(city, country, suppliedArrivalDate, suppliedDepartureDate, minStars, maxStars, minRate, maxRate, page) {
			var arrivalDate = suppliedArrivalDate.format("YYYY-MM-DD");
			var departureDate = suppliedDepartureDate.format("YYYY-MM-DD");
			var maxRate = maxRate == 500 ? "" : "&maxRate=" + maxRate;
			if (typeof page === 'undefined') {
				page = '';
			} else {
				page = '&page=' + page;
			}
			return $http.get("/data/list?city=" + city + "&country=" + country + "&arrivalDate=" + arrivalDate + "&departureDate=" + departureDate + "&minStarRating=" + minStars + "&maxStarRating=" + maxStars + "&minRate=" + minRate + maxRate + page);
		};

		var getPricing = function(suppliedArrivalDate, suppliedDepartureDate, hotels, sessionId) {
			var arrivalDate = suppliedArrivalDate.format("MM/DD/YYYY");
			var departureDate = suppliedDepartureDate.format("MM/DD/YYYY");
			var hotelIdList = "";
			angular.forEach(hotels, function(hotel, index){
				hotelIdList += hotel.hotel_id;
				if (index < hotels.length - 1){
					hotelIdList += ",";
				}
			});
			sessionId = sessionId === undefined ? "" : "&customerSessionId=" + sessionId;
			return $http.get("/data/pricing?arrivalDate=" + arrivalDate + "&departureDate=" + departureDate + "&hotelIdList=" + hotelIdList + sessionId);
		};

		return {
			getRegionHotels: getRegionHotels,
			getCalendar: getCalendar,
			getRegions: getRegions,
			getHotels: getHotels,
			getPricing: getPricing
		};
	}]);
})(angular.module('sharikiApp'));