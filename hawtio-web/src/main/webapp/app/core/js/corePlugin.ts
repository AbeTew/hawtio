/// <reference path='../../../d.ts/libraries.d.ts'/>
/// <reference path='pageTitle.ts'/>
/// <reference path='workspace.ts'/>
/// <reference path='helpers.ts'/>
/// <reference path='CodeEditor.ts'/>
/// <reference path='helpRegistry.ts'/>
/// <reference path='gridStyleDirective.ts'/>
/// <reference path='folder.ts'/>
/// <reference path='helpers.ts'/>
/// <reference path='dialog.ts'/>
/// <reference path='tables.ts'/>
/// <reference path='graphs.ts'/>
/// <reference path='../../jmx/js/jmxPlugin.ts'/>
/// <reference path='../../ui/js/uiPlugin.ts'/>
/// <reference path='../../perspective/js/perspectivePlugin.ts'/>

// Add any other known possible jolokia URLs here
var jolokiaUrls = [
  "/" + window.location.pathname.split('/')[1] + "/jolokia",
  "/hawtio/jolokia",  // instance configured by hawtio-web war file
  "/jolokia"          // instance that's already installed in a karaf container for example
  ];

var jolokiaUrl = getJolokiaUrl();
console.log("jolokiaUrl " + jolokiaUrl);

function getJolokiaUrl() {
  var query = hawtioPluginLoader.parseQueryString();
  var uri = query['url'];
  if (angular.isArray(uri)) {
    uri = uri[0];
  }
  return uri ? decodeURIComponent(uri) : null;
}

if (!jolokiaUrl) {
  jolokiaUrl = jolokiaUrls.find(function (url) {
    var jqxhr = $.ajax(url, {
      async: false,
      username: 'public',
      password: 'biscuit'
    });
    return jqxhr.status === 200 || jqxhr.status === 401 || jqxhr.status === 403;
  });
}

// bootstrap plugin loader
hawtioPluginLoader.addUrl("/hawtio/plugin");

if (jolokiaUrl) {
  // TODO replace with a jolokia call so we use authentication headers
  //hawtioPluginLoader.addUrl("jolokia:" + jolokiaUrl + ":hawtio:type=plugin,name=*");
}

/*
interface IMyAppScope extends ng.IRootScopeService, ng.IScope {
  lineCount: (value:any) => number;
  params: ng.IRouteParamsService;
  is: (type:any, value:any) => bool;
  empty: (value:any) => bool;
  log: (variable:string) => void;
  alert: (text:string) => void;
}
*/

hawtioPluginLoader.addModule('hawtioCore');

angular.module('hawtioCore', ['bootstrap', 'ngResource', 'ui', 'ui.bootstrap.dialog', 'hawtio-ui']).
        config(($routeProvider, $dialogProvider) => {

          $dialogProvider.options({
            backdropFade: true,
            dialogFade: true
          });

          $routeProvider.
                  when('/login', {templateUrl: 'app/core/html/login.html'}).
                  when('/preferences', {templateUrl: 'app/core/html/preferences.html'}).
                  when('/help', {
                    redirectTo: '/help/index'
                  }).
                  when('/help/:topic/', {templateUrl: 'app/core/html/help.html'}).
                  when('/help/:topic/:subtopic', {templateUrl: 'app/core/html/help.html'}).

                  otherwise({redirectTo: '/perspective/defaultPage'});
        }).
        constant('layoutTree', 'app/core/html/layoutTree.html').
        constant('layoutFull', 'app/core/html/layoutFull.html').
        service('localStorage',function () {
          // TODO Create correct implementation of windowLocalStorage
          var storage:WindowLocalStorage = window.localStorage || <any> (function () {
            return {};
          })();
          return storage;
        }).

        factory('marked',function () {
          marked.setOptions({
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: true,
            sanitize: false,
            smartLists: true,
            langPrefix: 'language-'
          });
          return marked;
        }).

        factory('pageTitle', function () {
          var answer = new Core.PageTitle();
          return answer;
        }).

        factory('viewRegistry',function () {
          return {};
        }).

        factory('lastLocation', function () {
          return {};
        }).

        factory('helpRegistry', function($rootScope) {
          return new Core.HelpRegistry($rootScope);
        }).

        factory('jolokiaUrl', function() {
          return jolokiaUrl;
        }).

        factory('jolokiaStatus', function() {
          return {
            xhr: null
          };
        }).
        factory('jolokiaParams', function(jolokiaUrl) {
          return {
            url: jolokiaUrl,
            canonicalNaming: false,
            ignoreErrors: true,
            mimeType: 'application/json'
          };
        }).

        factory('branding', function() {
          return {
            appName: 'hawtio',
            appLogo: 'img/logo-16px.png',
            loginBg: 'img/fire.jpg',
            fullscreenLogin: false
          }

        }).

        factory('userDetails', function(jolokiaUrl, localStorage) {
          var answer = angular.fromJson(localStorage[jolokiaUrl]);
          if (!angular.isDefined(answer)) {
            return {
              username: '',
              password: ''
            };
          } else {
            return answer;
          }

        }).

        factory('jolokia',($location:ng.ILocationService, localStorage, jolokiaStatus, $rootScope, userDetails, jolokiaParams) => {
          // TODO - Maybe have separate URLs or even jolokia instances for loading plugins vs. application stuff
          // var jolokiaUrl = $location.search()['url'] || url("/jolokia");
          console.log("Jolokia URL is " + jolokiaUrl);
          if (jolokiaUrl) {

            var credentials = hawtioPluginLoader.getCredentials(jolokiaUrl);
            // pass basic auth credentials down to jolokia if set
            var username = null;
            var password = null;

            //var userDetails = angular.fromJson(localStorage[jolokiaUrl]);

            if (credentials.length === 2) {
              username = credentials[0];
              password = credentials[1];

              // TODO we should try avoid both permutations of username / userName :)

            } else if (angular.isDefined(userDetails) &&
                       angular.isDefined(userDetails.username) &&
                       angular.isDefined(userDetails.password)) {

              username = userDetails.username;
              password = userDetails.password;

            } else if (angular.isDefined(userDetails) &&
                       angular.isDefined(userDetails.userName) &&
                       angular.isDefined(userDetails.password)) {

              username = userDetails.userName;
              password = userDetails.password;

            } else {
              // lets see if they are passed in via request parameter...
              var search = hawtioPluginLoader.parseQueryString();
              username = search["_user"];
              password = search["_pwd"];
              if (angular.isArray(username)) username = username[0];
              if (angular.isArray(password)) password = password[0];
            }

            if (username && password) {

              /*
              TODO can't use this, sets the username/password in the URL on every request, plus jolokia passes them on to $.ajax() which causes a fatal exception in firefox
              jolokiaParams['username'] = username;
              jolokiaParams['password'] = password;
              */

              //console.log("Using user / pwd " + username + " / " + password);

              userDetails.username = username;
              userDetails.password = password;

              $.ajaxSetup({
                beforeSend: (xhr) => {
                  xhr.setRequestHeader('Authorization', Core.getBasicAuthHeader(userDetails.username, userDetails.password));
                }
              });

              var loginUrl = jolokiaUrl.replace("jolokia", "auth/login/");
              $.ajax(loginUrl, {
                type: "POST",
                success: (response) => {
                  userDetails.loginDetails = response;
                },
                error: (xhr, textStatus, error) => {
                  // silently ignore, we could be using the proxy
                }
              });

            }

            jolokiaParams['ajaxError'] = (xhr, textStatus, error) => {
              if (xhr.status === 401 || xhr.status === 403) {
                userDetails.username = null;
                userDetails.password = null;
              } else {
                jolokiaStatus.xhr = xhr;
                if (!xhr.responseText && error) {
                  xhr.responseText = error.stack;
                }
              }
              Core.$apply($rootScope);
            };

            var jolokia = new Jolokia(jolokiaParams);
            localStorage['url'] = jolokiaUrl;
            jolokia.stop();
            return jolokia;
          } else {
            // empty jolokia that returns nothing
            return {
              request: () => null,
              register: () => null,
              list: () => null,
              search: () => null,
              read: () => null,
              execute: () => null,

              start: () => {
                this.running = true;
                return null;
              },
              stop: () => {
                this.running = false;
                return null;
              },
              isRunning: () => this.running,
              jobs: () => []
            };
          }
        }).

        factory('toastr', ($window) => {
          // TODO remove this <any>
          return (<any>window).toastr;
        }).
        factory('xml2json', ($window) => {
          var jquery:any = $;
          return jquery.xml2json;
        }).
        factory('workspace',($location:ng.ILocationService, jmxTreeLazyLoadRegistry, $compile:ng.ICompileService, $templateCache:ng.ITemplateCacheService, localStorage:WindowLocalStorage, jolokia, jolokiaStatus, $rootScope) => {
          var answer = new Workspace(jolokia, jolokiaStatus, jmxTreeLazyLoadRegistry, $location, $compile, $templateCache, localStorage, $rootScope);
          answer.loadTree();
          return answer;
        }).

        filter("valueToHtml", () => Core.valueToHtml).
        filter('humanize',() => humanizeValue).

        run(($rootScope, $routeParams, jolokia, workspace, localStorage, viewRegistry, layoutFull, helpRegistry, pageTitle:Core.PageTitle, branding, toastr) => {

          $.support.cors = true;

          /**
           * Count the number of lines in the given text
           */
          $rootScope.lineCount = lineCount;

          /**
           * Easy access to route params
           */
          $rootScope.params = $routeParams;

          /**
           * Wrapper for angular.isArray, isObject, etc checks for use in the view
           *
           * @param type {string} the name of the check (casing sensitive)
           * @param value {string} value to check
           */
          $rootScope.is = function (type:any, value:any):bool {
            return angular['is' + type](value);
          };

          /**
           * Wrapper for $.isEmptyObject()
           *
           * @param value  {mixed} Value to be tested
           * @return boolean
           */
          $rootScope.empty = function (value:any):bool {
            return $.isEmptyObject(value);
          };

          /**
           * Initialize jolokia polling and add handler to change poll
           * frequency
           */
          $rootScope.$on('UpdateRate', (event, rate) => {
            jolokia.stop();
            if (rate > 0) {
              jolokia.start(rate);
            }
            Core.log.info("Set update rate to: ", rate);
          });

          $rootScope.$emit('UpdateRate', localStorage['updateRate']);

          /**
           * Debugging Tools
           *
           * Allows you to execute debug functions from the view
           */
            // TODO Doesn't support vargs like it should
          $rootScope.log = function (variable:any):void {
            console.log(variable);
          };
          $rootScope.alert = function (text:string) {
            alert(text);
          };

          viewRegistry['fullscreen'] = layoutFull;
          viewRegistry['notree'] = layoutFull;
          viewRegistry['help'] = layoutFull;
          viewRegistry['preferences'] = layoutFull;
          viewRegistry['login'] = layoutFull;

          helpRegistry.addUserDoc('index', 'app/core/doc/overview.md');
          helpRegistry.addSubTopic('index', 'faq', 'app/core/doc/FAQ.md');
          helpRegistry.addSubTopic('index', 'changes', 'app/core/doc/CHANGES.md');
          helpRegistry.addSubTopic('index', 'developer', 'app/core/doc/developer.md');
          helpRegistry.addDevDoc('Core', 'app/core/doc/coreDeveloper.md');
          //helpRegistry.discoverHelpFiles(hawtioPluginLoader.getModules());

          var opts = localStorage['CodeMirrorOptions'];
          if (opts) {
            opts = angular.fromJson(opts);
            CodeEditor.GlobalCodeMirrorOptions = angular.extend(CodeEditor.GlobalCodeMirrorOptions, opts);
          }


          toastr.options = {
            'closeButton': true,
            'showMethod': 'slideDown',
            'hideMethod': 'slideUp'
          };


          window['logInterceptors'].push((level, message) => {
              if (level === "WARN") {
                notification('warning', message);
              }
              if (level === "ERROR") {
                notification('error', message);
              }

          });

          setTimeout(() => {
            $("#main-body").fadeIn(2000).after(() => {
              Core.log.info("<strong>Hawtio started!</strong>");
            });
          }, 500);

        }).
        directive('compile', ['$compile', function ($compile) {
          return function(scope, element, attrs) {
            scope.$watch(
                function(scope) {
                  // watch the 'compile' expression for changes
                  return scope.$eval(attrs.compile);
                },
                function(value) {
                  // when the 'compile' expression changes
                  // assign it into the current DOM
                  element.html(value);

                  // compile the new DOM and link it to the current
                  // scope.
                  // NOTE: we only compile .childNodes so that
                  // we don't get into infinite loop compiling ourselves
                  $compile(element.contents())(scope);
                }
            );
          };
        }]).
        directive('noClick', () => {
          return function($scope, $element, $attrs) {
            $element.click((event) => {
              event.preventDefault();
            });
          }
        }).
        directive('gridStyle', function($window) {
          return new Core.GridStyle($window);
        }).
        directive('logToggler', function(localStorage) {
          return {
            restrict: 'A',
            link: ($scope, $element, $attr) => {
              $element.click(() => {
                var log = $("#log-panel");
                var body = $('body');
                if (log.height() !== 0) {
                  localStorage['showLog'] = 'false';
                  log.css({'bottom': '110%'});
                  body.css({
                    'overflow-y': 'auto'
                    });
                } else {
                  localStorage['showLog'] = 'true';
                  log.css({'bottom': '50%'});
                  body.css({
                    'overflow-y': 'hidden'
                    });
                }
                return false;
              });
            }
          };

        });

// enable bootstrap tooltips
$(function () {
  $("a[title]").tooltip({
    selector: '',
    delay: { show: 1000, hide: 100 }
  });
});

var adjustHeight = function () {
  var windowHeight = $(window).height();
  var headerHeight = $("#main-nav").height();
  var containerHeight = windowHeight - headerHeight;
  $("#main").css("min-height", "" + containerHeight + "px");
}

$(function () {
  hawtioPluginLoader.loadPlugins(function () {
    var doc = $(document);
    angular.bootstrap(doc, hawtioPluginLoader.getModules());
    $(document.documentElement).attr('xmlns:ng', "http://angularjs.org");
    $(document.documentElement).attr('ng-app', 'hawtioCore');
    adjustHeight();
    $(window).resize(adjustHeight);
  });
});


