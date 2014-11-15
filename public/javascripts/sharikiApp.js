(function() {
	angular.module('sharikiApp', ['ui.slider', 'dateRangePicker', 'google-maps'.ns(), 'blockUI'])
	.config(function(blockUIConfigProvider){
		blockUIConfigProvider.autoBlock(false);
		blockUIConfigProvider.delay(1);
	});
})();