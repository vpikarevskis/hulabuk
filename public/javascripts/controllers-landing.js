var sharikiLandingApp = angular.module('sharikiLandingApp', ['duScroll', 'dateRangePicker']);

var divs = $('.landing');
$(window).scroll(function(){
   var percent = $(document).scrollTop() / ($(document).height() - $(window).height());
   divs.css('opacity', 1 - 3*percent);
});

sharikiLandingApp.controller('LandingCtrl', function($scope, $http, $window, $document){
	$window.viewportUnitsBuggyfill.init();

	$scope.cityLocationId = '9B0681E3-6D9F-47E8-8E14-5389F83569DD';
	$scope.locationData = {
		'9B0681E3-6D9F-47E8-8E14-5389F83569DD': {'country': 'FR', 'city': 'Paris'}
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

	$scope.signUp = function() {
		if ($scope.email != undefined) {
			$http.post("/data/signup", {email: $scope.email}).success(function(data){
				$scope.showUserFeedback = true;
				if (data.valid) {
					$scope.emailValid = true;
				} else {
					$scope.emailValid = false;
				}
				$document.scrollToElement(angular.element("#signup-container"), 0, 700);
			}).error(function(data){
				$scope.emailValid = false;
				$document.scrollToElement(angular.element("#signup-container"), 0, 700);
			});	
		}
		else {
			return;
		}
	};
});