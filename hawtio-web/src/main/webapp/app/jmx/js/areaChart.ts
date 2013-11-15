/// <reference path='../../definitions/DefinitelyTyped/angularjs/angular.d.ts'/>
/// <reference path='../../definitions/DefinitelyTyped/jquery/jquery.d.ts'/>
/// <reference path='../../definitions/jolokia-1.0.d.ts'/>
/// <reference path='../../definitions/logger.d.ts'/>
/// <reference path='../../definitions/sugar-1.3.d.ts'/>
/// <reference path='../../core/js/workspace.ts'/>
/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='jmxHelpers.ts'/>

module Jmx {

  export function AreaChartController($scope, $routeParams, jolokia, $templateCache, localStorage, $element) {

    $scope.mbean = $routeParams['mbean'];
    $scope.attribute = $routeParams['attribute'];
    $scope.duration = localStorage['updateRate'];

    $scope.width = 308;
    $scope.height = 296;

    $scope.template = "";

    $scope.entries = [];

    $scope.data = {
      entries: $scope.entries
    };

    $scope.req = [{type: 'read', mbean: $scope.mbean, attribute: $scope.attribute}];



    $scope.render = (response) => {

      $scope.entries.push({
        time: response.timestamp,
        count: response.value
      });

      $scope.entries = $scope.entries.last(15);

      if ($scope.template === "") {
        $scope.template = $templateCache.get("areaChart");
      }

      $scope.data = {
        _type: "date_histogram",
        entries: $scope.entries
      };

      Core.$apply($scope);

    };

    Core.register(jolokia, $scope, $scope.req, onSuccess($scope.render));




  }

}
