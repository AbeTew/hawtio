/// <reference path='../../definitions/DefinitelyTyped/angularjs/angular.d.ts'/>
/// <reference path='../../definitions/DefinitelyTyped/jquery/jquery.d.ts'/>
/// <reference path='../../definitions/jolokia-1.0.d.ts'/>
/// <reference path='../../definitions/logger.d.ts'/>
/// <reference path='../../definitions/sugar-1.3.d.ts'/>
/// <reference path='../../core/js/workspace.ts'/>
/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='helpers.ts'/>

module API {

  export function WsdlViewController($scope, $location, jolokia) {

    $scope.url = $location.search()["wsdl"];
    var log:Logging.Logger = Logger.get("API");
    var wsdlNamespace = "http://schemas.xmlsoap.org/wsdl/";

    loadXml($scope.url, onWsdl);

    function onWsdl(response) {
      $scope.services = [];
      var root = response.documentElement;
      var targetNamespace = root ? root.getAttribute("targetNamespace") : null;
      var name = root ? root.getAttribute("name") : null;
      var portTypes = response.getElementsByTagNameNS(wsdlNamespace, "portType");
      var services = response.getElementsByTagNameNS(wsdlNamespace, "service");
      var bindings = response.getElementsByTagNameNS(wsdlNamespace, "binding");

      angular.forEach(portTypes, (portType) => {
        var service = {
          name: name,
          targetNamespace: targetNamespace,
          portName: portType.getAttribute("name") || "Unknown",
          operations: []
        };
        $scope.services.push(service);
        var operations = portType.getElementsByTagNameNS(wsdlNamespace, "operation");
        angular.forEach(operations, (operation) => {
          var input = operation.getElementsByTagNameNS(wsdlNamespace, "input");
          var output = operation.getElementsByTagNameNS(wsdlNamespace, "output");

          function createMessageData(data) {
            var answer = [];
            angular.forEach(data, (item) => {
              var name = item.getAttribute("name");
              if (name) {
                answer.push({
                  name: name
                });
              }
            });
            return answer;
          }

          var opData = {
            name: operation.getAttribute("name") || "Unknown",
            inputs: createMessageData(input),
            outputs: createMessageData(output)
          };
          service.operations.push(opData);
        });
      });
      Core.$apply($scope);
    }

  }
}
