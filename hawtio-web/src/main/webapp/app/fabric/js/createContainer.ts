/// <reference path='fabricPlugin.ts'/>

module Fabric {

  export function CreateContainerController($scope, $element, $compile, $location, workspace, jolokia, localStorage) {

    $scope.versionsOp = 'versions()';

    $scope.entity = {
      number: 1
    };


    // the form properties stored in local storage
    // which we then default when creating a new container
    var localStorageProperties = {
      child: {
        jmxUser: 'fabric.userName',
        jmxPassword: 'fabric.password'
      },
      openshift: {
        serverUrl: 'openshift.serverUrl',
        login: 'openshift.login',
        password: 'openshift.password',
        domain: 'openshift.domain',
        gearProfile: 'openshift.gearProfile'
      },
      jclouds: {
        owner: 'jclouds.owner',
        credential: 'jclouds.credential',
        providerName: 'jclouds.providerName',
        imageId: 'jclouds.imageId',
        hardwareId: 'jclouds.hardwareId',
        locationId: 'jclouds.locationId',
        group: 'jclouds.group',
        instanceType: 'jclouds.instanceType'
      }
    };

    $scope.providers = Fabric.registeredProviders(jolokia);
    console.log("providers: ", $scope.providers);
    $scope.selectedProvider = $scope.providers[Object.extended($scope.providers).keys().first()];
    $scope.schema = {};

    $scope.response = {};

    $scope.versions = [];
    $scope.profiles = [];

    $scope.selectedVersion = {};

    $scope.selectedProfiles = [];
    $scope.selectedProfileIds = '';
    $scope.selectedVersionId = '';
    $scope.profileIdFilter = '';

    // referenced static data for child
    $scope.child = {
      rootContainers: []
    };


    // referenced static data for openshift
    $scope.openShift = {
      params: null,
      domains: [],
      gearProfiles: []
    };

    // referenced static data for jclouds
    $scope.jclouds = {
    };

    // holds all the form objects from nested child scopes
    $scope.forms = {};

    $scope.showAddProfileDialog = false;

    $scope.$watch('selectedProvider', (newValue, oldValue) => {
      if ($scope.selectedProvider) {
        Fabric.getSchema($scope.selectedProvider.id, $scope.selectedProvider.className, jolokia, (schema) => {
          $scope.schema = schema;
          Core.$apply($scope);
        });
      }
    }, true);

    $scope.$watch('schema', (newValue, oldValue) => {
      if (newValue !== oldValue) {

        $scope.entity['providerType'] = $scope.selectedProvider.id;
        $location.search('tab', $scope.selectedProvider.id);

        var providerId = $scope.entity['providerType'];
        var properties = localStorageProperties[providerId];

        // e.g. key = jmxUser, value = fabric.userName
        //
        //    $scope.entity['jmxUser'] = localStorage['fabric.userName'];
        //    $scope.entity['jmxPassword'] = localStorage['fabric.password'];

        angular.forEach(properties, (value, key) => {
          var localValue = localStorage[value];
          if (localValue) {
            $scope.entity[key] = localValue;
          }
        });

        Forms.defaultValues($scope.entity, $scope.schema);

        if ($scope.selectedProvider.id === 'child') {
          // load the root containers and default the parent if its not set
          var rootContainers = Fabric.getRootContainers(jolokia);
          $scope.child.rootContainers = rootContainers;
          if (rootContainers && rootContainers.length === 1 && !$scope.entity["parent"]) {
            $scope.entity["parent"] = rootContainers[0];
          }
        }
      }
    }, true);


    $scope.$watch('versions', (newValue, oldValue) => {
      if (newValue !== oldValue) {
        if (!$scope.selectedVersion) {
          if ($scope.selectedVersionId !== '') {
            $scope.selectedVersion = $scope.versions.find((v) => { return v.id === $scope.selectedVersionId });
          } else {
            $scope.selectedVersion = $scope.versions.find((v) => {return v.defaultVersion });
          }
        }
      }
    });


    $scope.$watch('selectedVersion', (newValue, oldValue) => {
      if (oldValue !== newValue) {
        if (newValue && 'id' in newValue) {
          $scope.selectedVersionId = newValue['id'];
          $location.search('versionId', $scope.selectedVersionId);
        }
      }
    }, true);


    $scope.deselect = (profile) => {
      profile.selected = false;
      $scope.selectedProfiles.remove((p) => { return p.id === profile.id; });
    };


    $scope.$watch('selectedProfiles', (newValue, oldValue) => {
      if (oldValue !== newValue) {
        log.debug("selectedProfiles: ", $scope.selectedProfiles);
        $scope.selectedProfileIds = $scope.selectedProfiles.map((p) => { return p.id; }).join(',');
      }
    }, true);


    $scope.$watch('selectedProfileIds', (newValue, oldValue) => {
      var profileIds = $scope.selectedProfileIds.split(',');
      var selected = [];
      profileIds.each((id) => {
        selected.push({
          id: id,
          selected: true
        });
      });
      $scope.selectedProfiles = selected;
      $location.search('profileIds', $scope.selectedProfileIds);
    });


    $scope.rootContainers = () => {
      return Fabric.getRootContainers(jolokia);
    };

    function updateOpenShift() {
      var serverUrl = Core.pathGet($scope.entity, ["serverUrl"]) || "openshift.redhat.com";
      var login = Core.pathGet($scope.entity, ["login"]);
      var password = Core.pathGet($scope.entity, ["password"]);

      var params = [serverUrl, login, password];
      if (!Object.equal(params, $scope.openShift.params)) {
        $scope.openShift.params = params;

        Fabric.getOpenShiftDomains(workspace, jolokia, serverUrl, login, password, (results) => {
          $scope.openShift.domains = results;
          console.log("found openshift domains: " + $scope.openShift.domains);
          Core.$apply($scope);
        });
        Fabric.getOpenShiftGearProfiles(workspace, jolokia, serverUrl, login, password, (results) => {
          $scope.openShift.gearProfiles = results;
          console.log("found openshift gears: " + $scope.openShift.gearProfiles);
          Core.$apply($scope);
        });
      }
    }

    $scope.$watch('entity.serverUrl', updateOpenShift);
    $scope.$watch('entity.login', updateOpenShift);
    $scope.$watch('entity.password', updateOpenShift);

    $scope.init = () => {

      var tab = $location.search()['tab'];
      if (tab) {
        $scope.selectedProvider = $scope.providers[tab];
      }

      var parentId = $location.search()['parentId'];
      if (parentId) {
        $scope.entity['parent'] = parentId;
      }

      var versionId = $location.search()['versionId'];
      if (versionId) {
        $scope.selectedVersion = {
          id: versionId
        };
      }

      var profileIds = $location.search()['profileIds'];
      if (profileIds) {
        $scope.selectedProfileIds = profileIds;
      }

      var count = $location.search()['number'];
      if (count) {
        $scope.entity.number = count;
      }

    };

    $scope.init();


    $scope.$on('$routeUpdate', $scope.init);


    $scope.onSubmit = (json, form) => {

      var providerId = $scope.entity['providerType'];
      if (json.saveJmxCredentials || 'child' !== providerId) {
        // e.g. key = jmxUser, value = fabric.userName
        //    localStorage['fabric.userName'] = $scope.entity.jmxUser;
        //    localStorage['fabric.password'] = $scope.entity.jmxPassword;
        var properties = localStorageProperties[providerId];

        angular.forEach(properties, (value, key) => {
          var entityValue = $scope.entity[key];
          if (entityValue) {
            localStorage[value] = entityValue;
          }
        });

      }

      delete json.saveJmxCredentials;

      if ( json.number === 1 ) {
        delete json.number;
      }

      json['version'] = $scope.selectedVersion.id;
      if ($scope.selectedProfiles.length > 0) {
        json['profiles'] = $scope.selectedProfiles.map((p) => { return p.id; });
      }

      setTimeout(() => {
        jolokia.execute(managerMBean, 'createContainers(java.util.Map)', angular.toJson(json), {
          method: "post",
          success: (response) => {
            var error = false;
            angular.forEach(response.value, function(value, key) {
              error = true;
              notification('error', "Creating container " + key + " failed: " + value);
            });
            if (!error) {
              notification('success', "Successfully created containers");
            }
            Core.$apply($scope);
          },
          error: (response) => {
            notification('error', "Error creating containers: " + response.error);
            Core.$apply($scope);
          }
        });
        Core.$apply($scope);
      }, 10);

      notification('info', "Requesting that new container(s) be created");
      $location.url('/fabric/containers');
    }

  }

}
