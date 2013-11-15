/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='helpers.ts'/>
/// <reference path='dashboardRepository.ts'/>
/// <reference path='fabricDashboardRepository.ts'/>
/// <reference path='gridsterDirective.ts'/>
/// <reference path='rectangleLocation.ts'/>
/// <reference path='../../fabric/js/fabricPlugin.ts'/>
/// <reference path='../../git/js/gitPlugin.ts'/>
/// <reference path='../../ui/js/uiPlugin.ts'/>
module Dashboard {
  
  export var templatePath = 'app/dashboard/html/';
  export var pluginName = 'dashboard';
  
  angular.module(pluginName, ['bootstrap', 'ngResource', 'hawtioCore', 'hawtio-ui']).
          config(($routeProvider) => {

            $routeProvider.
                    when('/dashboard/add', {templateUrl: Dashboard.templatePath + 'addToDashboard.html'}).
                    when('/dashboard/edit', {templateUrl: Dashboard.templatePath + 'editDashboards.html'}).
                    when('/dashboard/idx/:dashboardIndex', {templateUrl: Dashboard.templatePath + 'dashboard.html'}).
                    when('/dashboard/id/:dashboardId', {templateUrl: Dashboard.templatePath + 'dashboard.html'}).
                    when('/dashboard/id/:dashboardId/share', {templateUrl: Dashboard.templatePath + 'share.html'}).
                    when('/dashboard/import', {templateUrl: Dashboard.templatePath + 'import.html'});

          }).
          value('ui.config', {
            // The ui-jq directive namespace
            jq: {
              gridster: {
                widget_margins: [10, 10],
                widget_base_dimensions: [140, 140]
              }
            }
          }).
          factory('dashboardRepository', function (workspace:Workspace, jolokia, localStorage) {
            return new DefaultDashboardRepository(workspace, jolokia, localStorage);
          }).
          directive('hawtioDashboard', function() {
            return new Dashboard.GridsterDirective();
          }).
          run(($location:ng.ILocationService, workspace:Workspace, viewRegistry, helpRegistry) => {

            viewRegistry['dashboard'] = 'app/dashboard/html/layoutDashboard.html';
            helpRegistry.addUserDoc('dashboard', 'app/dashboard/doc/help.md');

            workspace.topLevelTabs.push({
              content: "Dashboard",
              title: "View and edit your own custom dashboards",
              isValid: (workspace: Workspace) => true,
              href: () => "#/dashboard/idx/0?tab=dashboard",
              isActive: (workspace: Workspace) => workspace.isTopTabActive("dashboard")
            });

          });

  hawtioPluginLoader.addModule(pluginName);
}
