/// <reference path='../../definitions/DefinitelyTyped/angularjs/angular.d.ts'/>
/// <reference path='../../definitions/DefinitelyTyped/jquery/jquery.d.ts'/>
/// <reference path='../../definitions/jolokia-1.0.d.ts'/>
/// <reference path='../../definitions/logger.d.ts'/>
/// <reference path='../../definitions/sugar-1.3.d.ts'/>
/// <reference path='../../core/js/coreHelpers.ts'/>
/// <reference path='../../core/js/workspace.ts'/>
/// <reference path='../../fabric/js/helpers.ts'/>
/// <reference path='karafHelpers.ts'/>


module Karaf {

  export function FeaturesController($scope, $location, workspace, jolokia) {

    $scope.hasFabric = Fabric.hasFabric(workspace);
    $scope.responseJson = '';
    $scope.filter = '';

    $scope.installedFeatures = [];

    $scope.features = [];
    $scope.repositories = [];
    $scope.selectedRepositoryId = '';
    $scope.selectedRepository = {};


    $scope.init = () => {

      var selectedRepositoryId = $location.search()['repositoryId'];
      if (selectedRepositoryId) {
        $scope.selectedRepositoryId = selectedRepositoryId;
      }

      var filter = $location.search()['filter'];
      if (filter) {
        $scope.filter = filter;
      }

    };

    $scope.init();

    $scope.$watch('selectedRepository', (newValue, oldValue) => {
      console.log("selectedRepository: ", $scope.selectedRepository);
      if (newValue !== oldValue) {
        if (!newValue) {
          $scope.selectedRepositoryId = '';
        } else {
          $scope.selectedRepositoryId = newValue['repository'];
        }
        $location.search('repositoryId', $scope.selectedRepositoryId);
      }
    }, true);

    $scope.$watch('filter', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        $location.search('filter', newValue);
      }
    });

    var featuresMBean = Karaf.getSelectionFeaturesMBean(workspace);

    log.debug("Features mbean: ", featuresMBean);

    if (featuresMBean) {
      Core.register(jolokia, $scope, {
        type: 'read', mbean: featuresMBean
      }, onSuccess(render));
    }

    $scope.triggerRefresh = () => {
      jolokia.request({
        type: 'read',
        method: 'POST',
        mbean: featuresMBean
      }, onSuccess(render));
    };

    $scope.install = (feature) => {
      //$('.popover').remove();
      notification('info', 'Installing feature ' + feature.Name);
      installFeature(workspace, jolokia, feature.Name, feature.Version, () => {
        notification('success', 'Installed feature ' + feature.Name);
        $scope.installedFeatures.add(feature);
        $scope.triggerRefresh();
        Core.$apply($scope);
      }, (response) => {
        log.error('Failed to install feature ', feature.Name, ' due to ', response.error);
        log.info('stack trace: ', response.stacktrace);
        Core.$apply($scope);
      });
    };

    $scope.uninstall = (feature) => {
      //$('.popover').remove();
      notification('info', 'Uninstalling feature ' + feature.Name);
      uninstallFeature(workspace, jolokia, feature.Name, feature.Version, () => {
        notification('success', 'Uninstalled feature ' + feature.Name);
        $scope.installedFeatures.remove(feature);
        $scope.triggerRefresh();
        Core.$apply($scope);
      }, (response) => {
        log.error('Failed to uninstall feature ', feature.Name, ' due to ', response.error);
        log.info('stack trace: ', response.stacktrace);
        Core.$apply($scope);
      });
    };

    $scope.filteredRows = ['Bundles', 'Configurations', 'Configuration Files', 'Dependencies'];

    $scope.showRow = (key, value) => {

      if ($scope.filteredRows.any(key)) {
        return false;
      }

      if (angular.isArray(value)) {
        if (value.length === 0) {
          return false;
        }
      }

      if (angular.isString(value)) {
        if (Core.isBlank(value)) {
          return false;
        }
      }

      if (angular.isObject(value)) {
        if (!value || Object.equal(value, {})) {
          return false;
        }
      }

      return true;
    };

    $scope.installed = (installed) => {
      var answer = Core.parseBooleanValue(installed);

      if ($scope.hasFabric) {
        return !answer;
      }

      return answer;
    };

    $scope.showValue = (value) => {
      if (angular.isArray(value)) {
        var answer = ['<ul class="zebra-list">']
        value.forEach((v) => { answer.push('<li>' + v + '</li>')});
        answer.push('</ul>');
        return answer.join('\n');
      }
      if (angular.isObject(value)) {
        var answer = ['<table class="table">', '<tbody>']

        angular.forEach(value, (value, key) => {
          answer.push('<tr>');
          answer.push('<td>' + key + '</td>')
          answer.push('<td>' + value + '</td>')
          answer.push('</tr>');
        });

        answer.push('</tbody>');
        answer.push('</table>');

        return answer.join('\n');
      }
      return "" + value;
    };

    $scope.getStateStyle = (feature) => {
      if (Core.parseBooleanValue(feature.Installed)) {
        return "badge badge-success";
      }
      return "badge";
    };

    $scope.filterFeature = (feature) => {
      if (Core.isBlank($scope.filter)) {
        return true;
      }
      if (feature.Id.has($scope.filter)) {
        return true;
      }
      return false;
    };

    function render(response) {
      var responseJson = angular.toJson(response.value);
      if ($scope.responseJson !== responseJson) {
        $scope.responseJson = responseJson;
        //log.debug("Got response: ", response.value);

        var features = [];
        var repositories = [];

        populateFeaturesAndRepos(response.value, features, repositories);

        var installedFeatures = features.filter((f) => { return Core.parseBooleanValue(f.Installed); });
        var uninstalledFeatures = features.filter((f) => { return !Core.parseBooleanValue(f.Installed); });

        //log.debug("repositories: ", repositories);

        $scope.installedFeatures = installedFeatures.sortBy((f) => { return f['Name'] });
        uninstalledFeatures = uninstalledFeatures.sortBy((f) => { return f['Name'] });

        repositories.sortBy('id').map((r) => { return r['id'] }).forEach((repo) => {
          $scope.repositories.push({
            repository: repo,
            features: uninstalledFeatures.filter((f) => { return f['RepositoryName'] === repo })
          });
        });

        if (Core.isBlank($scope.selectedRepositoryId)) {
          $scope.selectedRepository = $scope.repositories.first();
        } else {
          $scope.selectedRepository = $scope.repositories.find((r) => { return r.repository === $scope.selectedRepositoryId });
        }

        Core.$apply($scope);
      }
    }
  }
}
