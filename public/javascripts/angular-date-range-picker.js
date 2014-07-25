(function() {
  angular.module("dateRangePicker", ['pasvaz.bindonce']);

  angular.module("dateRangePicker").directive("dateRangePicker", [
    "$compile", "$timeout", function($compile, $timeout) {
      var CUSTOM, pickerTemplate;
      pickerTemplate = "<div class=\"col-xs-12 col-md-1\"> <a ng-click=\"move(-1, $event)\" class=\"month-arrow\"><span class=\"hidden-xs pull-right fui-arrow-left\"></span><i class=\"visible-xs text-center fa fa-angle-up\"></i> </a>\n  </div>\n  <div bindonce ng-repeat=\"month in months\" class=\"col-md-5 col-xs-12 cal-entry\">\n      <div class=\"angular-date-range-picker__month-name\" bo-text=\"month.name\"><</div>\n      <table class=\"table\">\n        <tr>\n          <th bindonce ng-repeat=\"day in month.weeks[1]\" class=\"angular-date-range-picker__calendar-weekday\" bo-text=\"day.date.format('dd')\">\n          </th>\n        </tr>\n        <tr bindonce ng-repeat=\"week in month.weeks\">\n          <td\n              bo-class='{\n                \"angular-date-range-picker__calendar-day\": day,\n                \"angular-date-range-picker__calendar-day-selected\": day.selected,\n                \"angular-date-range-picker__calendar-day-unavailable\": day.unavailable,\n                \"angular-date-range-picker__calendar-day-disabled\": day.disabled,\n                \"angular-date-range-picker__calendar-day-start\": day.start,\n              \"angular-date-range-picker__calendar-day-nephritis\": day.bucket === 0,\n              \"angular-date-range-picker__calendar-day-emerald\": day.bucket === 1,\n              \"angular-date-range-picker__calendar-day-sunflower\": day.bucket === 2,\n              \"angular-date-range-picker__calendar-day-orange\": day.bucket === 3,\n              \"angular-date-range-picker__calendar-day-carrot\": day.bucket === 4,\n              \"angular-date-range-picker__calendar-day-pumpkin\": day.bucket === 5,\n              \"angular-date-range-picker__calendar-day-alizarin\": day.bucket === 6,\n              \"angular-date-range-picker__calendar-day-pomegranate\": day.bucket >= 7\n              }'\n              ng-repeat=\"day in week track by $index\" ng-click=\"select(day, $event)\">\n              <div class=\"angular-date-range-picker__calendar-day-wrapper\" bo-text=\"day.date.date()\"></div>\n          </td>\n        </tr>\n      </table>\n    </div>\n  <div class=\"col-xs-12 col-md-1\">  <a ng-click=\"move(+1, $event)\" class=\"month-arrow\"><span class=\"hidden-xs pull-left fui-arrow-right\"></span><i class=\"visible-xs text-center fa fa-angle-down\"></i></a>\n  </div>\n  </div>";
      CUSTOM = "CUSTOM";
      return {
        restrict: "AE",
        replace: true,
        template: "",
        scope: {
          model: "=ngModel",
          customSelectOptions: "=",
          alwaysVisible: "=",
          ranged: "=",
          calendarAverages: "=",
          pastDates: "@",
          callback: "&"
        },
        link: function($scope, element, attrs) {
          var documentClickFn, domEl, _calculateRange, _checkQuickList, _makeQuickList, _prepare;
          $scope.quickListDefinitions = $scope.customSelectOptions;
          if ($scope.quickListDefinitions == null) {
            $scope.quickListDefinitions = [
              {
                label: "This week",
                range: moment().range(moment().startOf("week").startOf("day"), moment().endOf("week").startOf("day"))
              }, {
                label: "Next week",
                range: moment().range(moment().startOf("week").add(1, "week").startOf("day"), moment().add(1, "week").endOf("week").startOf("day"))
              }, {
                label: "This fortnight",
                range: moment().range(moment().startOf("week").startOf("day"), moment().add(1, "week").endOf("week").startOf("day"))
              }, {
                label: "This month",
                range: moment().range(moment().startOf("month").startOf("day"), moment().endOf("month").startOf("day"))
              }, {
                label: "Next month",
                range: moment().range(moment().startOf("month").add(1, "month").startOf("day"), moment().add(1, "month").endOf("month").startOf("day"))
              }
            ];
          }
          $scope.quick = null;
          $scope.range = null;
          $scope.selecting = false; 
          $scope.visible = false;
          $scope.start = null;
          $scope.showRanged = $scope.ranged === void 0 ? true : $scope.ranged;
          _makeQuickList = function(includeCustom) {
            var e, _i, _len, _ref, _results;
            if (includeCustom == null) {
              includeCustom = false;
            }
            if (!$scope.showRanged) {
              return;
            }
            $scope.quickList = [];
            if (includeCustom) {
              $scope.quickList.push({
                label: "Custom",
                range: CUSTOM
              });
            }
            _ref = $scope.quickListDefinitions;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              e = _ref[_i];
              _results.push($scope.quickList.push(e));
            }
            return _results;
          };
          _calculateRange = function() {
            var end, start;
            if ($scope.showRanged) {
              return $scope.range = $scope.selection ? (start = $scope.selection.start.clone().startOf("month").startOf("day"), end = start.clone().add(1, "months").endOf("month").startOf("day"), moment().range(start, end)) : moment().range(moment().startOf("month").startOf("day"), moment().endOf("month").add(1, "month").startOf("day"));
            } else {
              $scope.selection = false;
              $scope.selection = $scope.model || false;
              $scope.date = moment($scope.model) || moment();
              return $scope.range = moment().range(moment($scope.date).startOf("month"), moment($scope.date).endOf("month"));
            }
          };
          _checkQuickList = function() {
            var e, _i, _len, _ref;
            if (!$scope.showRanged) {
              return;
            }
            if (!$scope.selection) {
              return;
            }
            _ref = $scope.quickList;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              e = _ref[_i];
              if (e.range !== CUSTOM && $scope.selection.start.startOf("day").unix() === e.range.start.startOf("day").unix() && $scope.selection.end.startOf("day").unix() === e.range.end.startOf("day").unix()) {
                $scope.quick = e.range;
                _makeQuickList();
                return;
              }
            }
            $scope.quick = CUSTOM;
            return _makeQuickList(true);
          };
          _prepare = function() {
            var m, startDay, startIndex, _i, _len, _ref;
            $scope.months = [];
            startIndex = $scope.range.start.year() * 12 + $scope.range.start.month();
            startDay = moment().startOf("isoWeek").day();
            $scope.range.by("days", function(date) {
              var d, dis, m, sel, w, _base, _base1;
              d = date.day() - startDay;
              if (d < 0) {
                d = 7 + d;
              }
              m = date.year() * 12 + date.month() - startIndex;
              w = parseInt((7 + date.date() - d) / 7);
              sel = false;
              dis = false;
              unavail = false;
              buc = -1;
              dateFormatted = date.format('MM/DD/YYYY');
              if ($scope.showRanged) {
                if ($scope.start) {
                  sel = date === $scope.start;
                  dis = date < $scope.start;

                  if ($scope.pastDates){
                    unavail = moment().diff(date, 'days') > 0;
                    dis = unavail ? false : dis;
                  }
                  if ($scope.calendarAverages && !unavail & !dis & dateFormatted in $scope.calendarAverages){
                     buc = $scope.calendarAverages[dateFormatted].buc;
                  }

                } else {
                  sel = $scope.selection && $scope.selection.contains(date);
                  if ($scope.pastDates){
                    unavail = moment().diff(date, 'days') > 0;
                  }

                  if ($scope.calendarAverages && !unavail & dateFormatted in $scope.calendarAverages){
                     buc = $scope.calendarAverages[dateFormatted].buc;
                     
                  }
                }
              } else {
                sel = date.isSame($scope.selection);
                if ($scope.pastDates) {
                  unavail = moment().diff(date, 'days') > 0;
                }
              }
              (_base = $scope.months)[m] || (_base[m] = {
                name: date.format("MMMM YYYY"),
                weeks: []
              });
              (_base1 = $scope.months[m].weeks)[w] || (_base1[w] = []);
              return $scope.months[m].weeks[w][d] = {
                date: date,
                selected: sel,
                unavailable: unavail,
                disabled: dis,
                bucket: buc,
                start: $scope.start && $scope.start.unix() === date.unix()
              };
            });
            _ref = $scope.months;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              m = _ref[_i];
              if (!m.weeks[0]) {
                m.weeks.splice(0, 1);
              }
            }
            return _checkQuickList();
          };

          $scope.$watch('calendarAverages', function(newValue, oldValue){
            return _prepare();
          });

          $scope.show = function() {
            $scope.selection = $scope.model;
            _calculateRange();
            _prepare();
            return $scope.visible = true;
          };
          $scope.hide = function($event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            $scope.visible = false;
            return $scope.start = null;
          };
          $scope.prevent_select = function($event) {
            return $event != null ? typeof $event.stopPropagation === "function" ? $event.stopPropagation() : void 0 : void 0;
          };
          $scope.ok = function($event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            $scope.model = $scope.selection;
            $timeout(function() {
              if ($scope.callback) {
                return $scope.callback();
              }
            });
            return $scope.hide();
          };
          $scope.select = function(day, $event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            
            if (!day || day.disabled || day.unavailable || ($scope.selecting && $scope.start.diff(day.date, "days") === 0)) {
              return;
            }

            if ($scope.showRanged) {
              $scope.selecting = !$scope.selecting;
              if ($scope.selecting) {
                $scope.start = day.date;
                $scope.model = null;
              } else {
                $scope.selection = moment().range($scope.start, day.date);
                $scope.start = null;
                $scope.model = $scope.selection;
              }
            } else {
              $scope.selection = moment(day.date);
              $scope.model = $scope.selection;
            }
            return _prepare();
          };
          $scope.move = function(n, $event) {
            if ($event != null) {
              if (typeof $event.stopPropagation === "function") {
                $event.stopPropagation();
              }
            }
            if (n <= 0 && $scope.range.start.month() == moment().month())
            {
              return;
            }

            if ($scope.showRanged) {
              $scope.range = moment().range($scope.range.start.add(n, 'months').startOf("month").startOf("day"), $scope.range.start.clone().add(1, "months").endOf("month").startOf("day"));
            } else {
              $scope.date.add(n, 'months');
              $scope.range = moment().range(moment($scope.date).startOf("month"), moment($scope.date).endOf("month"));
            }
            return _prepare();
          };
          $scope.handlePickerClick = function($event) {
            return $event != null ? typeof $event.stopPropagation === "function" ? $event.stopPropagation() : void 0 : void 0;
          };
          $scope.$watch("quick", function(q, o) {
            if (!q || q === CUSTOM) {
              return;
            }
            $scope.selection = $scope.quick;
            $scope.selecting = false;
            $scope.start = null;
            _calculateRange();
            return _prepare();
          });
          $scope.$watch("customSelectOptions", function(value) {
            if (typeof customSelectOptions === "undefined" || customSelectOptions === null) {
              return;
            }
            return $scope.quickListDefinitions = value;
          });
          domEl = $compile(angular.element(pickerTemplate))($scope);
          element.append(domEl);
          element.bind("click", function(e) {

            if (e != null) {
              if (typeof e.stopPropagation === "function") {
                e.stopPropagation();
              }
            }
            return $scope.$apply(function() {
              if ($scope.alwaysVisible){
                return;
              }
              if ($scope.visible) {
                return $scope.hide();
              } else {
                return $scope.show();
              }
            });
          });
          documentClickFn = function(e) {
            $scope.$apply(function() {
              if ($scope.alwaysVisible){
                return;
              }
              return $scope.hide();
            });
            return true;
          };
          angular.element(document).bind("click", documentClickFn);
          $scope.$on('$destroy', function() {
            return angular.element(document).unbind('click', documentClickFn);
          });
          _makeQuickList();
          _calculateRange();
          return _prepare();
        }
      };
    }
  ]);

}).call(this);
