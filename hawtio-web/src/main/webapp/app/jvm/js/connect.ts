/// <reference path='../../definitions/DefinitelyTyped/angularjs/angular.d.ts'/>
/// <reference path='../../definitions/DefinitelyTyped/jquery/jquery.d.ts'/>
/// <reference path='../../definitions/jolokia-1.0.d.ts'/>
/// <reference path='../../definitions/logger.d.ts'/>
/// <reference path='../../definitions/sugar-1.3.d.ts'/>
/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='../../core/js/workspace.ts'/>
/// <reference path='jvmHelpers.ts'/>

module JVM {
  export function ConnectController($scope, $location, localStorage, workspace) {

    JVM.configureScope($scope, $location, workspace);

    $scope.useProxy = true;

    // lets load the local storage configuration
    var key = "jvmConnect";
    var config = {};
    var configJson = localStorage[key];
    if (configJson) {
      try {
        config = JSON.parse(configJson);
      } catch (e) {
        // ignore
      }
    }
    $scope.host = config["host"] || "localhost";
    $scope.path = config["path"] || "jolokia";
    $scope.port = config["port"] || 8181;
    $scope.userName = config["userName"];
    $scope.password = config["password"];

    // replicate changes to local storage
    angular.forEach(["userName", "password", "port", "path", "host"], (name) => {
      $scope.$watch(name, () => {
        var value = $scope[name];
        if (value) {
          config[name] = value;
          localStorage[key] = JSON.stringify(config);
        }
      });
    });

    $scope.gotoServer = () => {
      var options:Core.ConnectToServerOptions = new Core.ConnectToServerOptions();
      var host = $scope.host || 'localhost';

      // lets trim any http:// prefix or / postfix
      var idx = host.indexOf("://");
      if (idx >= 0) {
        host = host.substring(idx + 3);
      }
      idx = host.indexOf("/");
      if (idx >= 0) {
        host = host.substring(0, idx);
      }

      console.log("using host name: " + host);
      options.host = host;
      options.port = $scope.port;
      options.path = $scope.path;
      options.userName = $scope.userName;
      options.password = $scope.password;
      options.useProxy = $scope.useProxy;

      Core.connectToServer(localStorage, options);
    }
  }
}
