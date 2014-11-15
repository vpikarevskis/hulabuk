(function(app) {
	app.directive('hotelCard', function(){
		return {
			restrict: 'E',
			transclude: false,
			scope: {
				hotel: '='
			},
			template: '<div class="hotel-listing">\
							<div class="img-container">\
								<img class="img-rounded img-responsive img-aspect-ratio" ng-src="{{hotel.url}}"></img>\
							</div>\
							<p class="lead text-center"><strong><small class="hotel-name">{{hotel.hotel_name}}</small></strong></p>\
							<p class="text-muted text-center"><small><span ng-if="hotel.stars.length > 0" ng-repeat="star in hotel.stars track by $index">&#9733;</span>&nbsp;</small></p>\
							<div class="form-group">\
								<a ng-disabled="hotel.loading || (hotel.loaded && !hotel.priceUpdated)" ng-href="{{hotel.bookingUrl}}" class="btn btn-block btn-primary btn-add">\
									<span ng-show="!hotel.loaded || hotel.priceUpdated">Book at £{{ hotel.average | number : 0 }} per night</span>\
									<span ng-show="hotel.loaded && !hotel.priceUpdated">Damn, all booked! Try other dates.</span>\
									<div ng-show="hotel.loading" class="pull-right three-quarters three-quarters-white"></div>\
								</a>\
							</div>\
						</div>'
		};
	});
})(angular.module('sharikiApp'));