module Fabric {

  export function FabricBrokerDiagramController($scope, localStorage, $routeParams, $location, jolokia, workspace, $compile, $templateCache) {

    Fabric.initScope($scope, $location, jolokia, workspace);

    var defaultFlags = {
      group: false,
      profile: false,
      slave: false,
      broker: true,
      container: false,
      queue: true,
      topic: true,
      consumer: true,
      producer: true
    };

    $scope.showFlags = {
      group: false,
      profile: false,
      slave: false,
      broker: true,
      container: false,
      queue: true,
      topic: true,
      consumer: true,
      producer: true
    };

    $scope.shapeSize = {
      broker: 20,
      queue: 14,
      topic: 14
    };

    var graphBuilder = new ForceGraph.GraphBuilder();

    Core.bindModelToSearchParam($scope, $location, "searchFilter", "q", "");

    angular.forEach($scope.showFlags, (value, key) => {
      var modelName = "showFlags." + key;

      // bind model values to search params...
      function currentValue() {
        var answer = $location.search()[paramName] || defaultFlags[key];
        return answer === "false" ? false : answer;
      }

      var paramName = key;
      var value = currentValue();
      Core.pathSet($scope, modelName, value);

      $scope.$watch(modelName, () => {
        var current = Core.pathGet($scope, modelName);
        var old = currentValue();
        if (current !== old) {
          var defaultValue = defaultFlags[key];
          if (current !== defaultValue) {
            if (!current) {
              current = "false";
            }
            $location.search(paramName, current);
          } else {
            $location.search(paramName, null);
          }
        }
        redrawGraph();
      });

    });

    $scope.$watch("searchFilter", (newValue, oldValue) => {
      redrawGraph();
    });

    if (Fabric.hasMQManager) {
      Core.register(jolokia, $scope, {type: 'exec', mbean: Fabric.mqManagerMBean, operation: "loadBrokerStatus()"}, onSuccess(onBrokerData));
    }

    function onBrokerData(response) {
      if (response) {
        var responseJson = angular.toJson(response.value);
        if ($scope.responseJson === responseJson) {
          return;
        }

        $scope.responseJson = responseJson;

        $scope.brokers = response.value;
        redrawGraph();
      }
    }

    function redrawGraph() {
      graphBuilder = new ForceGraph.GraphBuilder();

      var containersToDelete = $scope.activeContainers || {};
      $scope.activeContainers = {};

      angular.forEach($scope.brokers, (brokerStatus) => {
        // only query master brokers which are provisioned correctly
        brokerStatus.validContainer = brokerStatus.alive && brokerStatus.master && brokerStatus.provisionStatus === "success";
        // don't use type field so we can use it for the node types..
        renameTypeProperty(brokerStatus);
        //log.info("Broker status: " + angular.toJson(brokerStatus, true));

        var groupId = brokerStatus.group;
        var profileId = brokerStatus.profile;
        var brokerId = brokerStatus.brokerName;
        var containerId = brokerStatus.container;
        var versionId = brokerStatus.version || "1.0";

        var group = getOrAddNode("group", groupId, brokerStatus, () => {
          return {
            /*
             navUrl: ,
             image: {
             url: "/hawtio/app/osgi/img/bundle.png",
             width: 32,
             height:32
             },
             */
            popup: {
              title: "Broker Group: " + groupId,
              content: "<p>" + groupId + "</p>"
            }
          };
        });

        var profile = getOrAddNode("profile", profileId, brokerStatus, () => {
          return {
            popup: {
              title: "Profile: " + profileId,
              content: "<p>" + profileId + "</p>"
            }
          };
        });
        var master = brokerStatus.master;
        var broker = null;
        var brokerFlag = master ? $scope.showFlags.broker : $scope.showFlags.slave;
        if (brokerFlag) {
          broker = getOrAddNode("broker", brokerId, brokerStatus, () => {
            return {
              type: master ? "brokerMaster" : "broker",
              popup: {
                title: (master ? "Master" : "Slave") + " Broker: " + brokerId,
                content: "<p>Container: " + containerId + "</p> <p>Group: " + groupId + "</p>"
              }
            };
          });
        }

        // TODO do we need to create a physical broker node per container and logical broker maybe?
        var container = null;
        if (containerId) {
          container = getOrAddNode("container", containerId, brokerStatus, () => {
            return {
              containerId: containerId,
              popup: {
                title: "Container: " + containerId,
                content: "<p>" + containerId + " version: " + versionId + "</p>"
              }
            };
          });
        }


        if (container && container.validContainer) {
          var key = container.containerId;
          $scope.activeContainers[key] = container;
          delete containersToDelete[key];
        }

        // add the links...
        if ($scope.showFlags.group) {
          if ($scope.showFlags.profile) {
            addLink(group, profile, "group");
            addLink(profile, broker, "broker");
          } else {
            addLink(group, broker, "group");
          }
        } else {
          if ($scope.showFlags.profile) {
            addLink(profile, broker, "broker");
          }
        }

        if (container) {
          if ((master || $scope.showFlags.slave) && $scope.showFlags.container) {
            addLink(broker, container, "container");
            container.destinationLinkNode = container;
          } else {
            container.destinationLinkNode = broker;
          }
        }
      });

      // TODO delete any nodes from dead containers in containersToDelete
      angular.forEach($scope.activeContainers, (container, id) => {
        var containerJolokia = container.jolokia;
        if (containerJolokia) {
          onContainerJolokia(containerJolokia, container, id);
        } else {
          Fabric.containerJolokia(jolokia, id, (containerJolokia) => onContainerJolokia(containerJolokia, container, id));
        }
      });
      $scope.graph = graphBuilder.buildGraph();
      Core.$apply($scope);
    }

    function brokerNameMarkup(brokerName) {
      return brokerName ? "<p></p>broker: " + brokerName + "</p>" : "";
    }

    function onContainerJolokia(containerJolokia, container, id) {
      if (containerJolokia) {
        container.jolokia = containerJolokia;

        function getOrAddDestination(properties) {
          var typeName = properties.destType;
          var destinationName = properties.destinationName;
          if (!destinationName || ($scope.searchFilter && destinationName.indexOf($scope.searchFilter) < 0)) {
            return null;
          }
          // should we be filtering this destination out
          var hideFlag = "topic" === typeName ? $scope.showFlags.topic: $scope.showFlags.queue;
          if (!hideFlag) {
            return null;
          }
          return getOrAddNode(typeName, destinationName, properties, () => {
            return {
              popup: {
                title: (properties.destinationType || "Queue") + ": " + destinationName,
                content: brokerNameMarkup(properties.brokerName)
              }
            };
          });
        }

        // find consumers
        if ($scope.showFlags.consumer) {
          containerJolokia.search("org.apache.activemq:endpoint=Consumer,*", onSuccess((response) => {
            angular.forEach(response, (objectName) => {
              //log.info("Got consumer: " + objectName + " on container: " + id);
              var details = Core.parseMBean(objectName);
              if (details) {
                var properties = details['attributes'];
                if (properties) {
                  configureDestinationProperties(properties);
                  var consumerId = properties.consumerId;
                  if (consumerId) {
                    var destination = getOrAddDestination(properties);
                    if (destination) {
                      addLink(container.destinationLinkNode, destination, "destination");
                      var consumer = getOrAddNode("consumer", consumerId, properties, () => {
                        return {
                          popup: {
                            title: "Consumer: " + consumerId,
                            content: "<p>client: " + (properties.clientId || "") + "</p> " + brokerNameMarkup(properties.brokerName)
                          }
                        };
                      });
                      addLink(destination, consumer, "consumer");
                    }
                  }
                }
              }
            });
            graphModelUpdated();
          }));
        }

        // find producers
        if ($scope.showFlags.producer) {
          containerJolokia.search("org.apache.activemq:endpoint=Producer,*", onSuccess((response) => {
            angular.forEach(response, (objectName) => {
              var details = Core.parseMBean(objectName);
              if (details) {
                var properties = details['attributes'];
                if (properties) {
                  configureDestinationProperties(properties);
                  var producerId = properties.producerId;
                  if (producerId) {
                    var destination = getOrAddDestination(properties);
                    if (destination) {
                      addLink(container.destinationLinkNode, destination, "destination");
                      var producer = getOrAddNode("producer", producerId, properties, () => {
                        return {
                          popup: {
                            title: "Producer: " + producerId,
                            content: "<p>client: " + (properties.clientId || "") + "</p> " + brokerNameMarkup(properties.brokerName)
                          }
                        };
                      });
                      addLink(producer, destination, "producer");
                    }
                    graphModelUpdated();
                  }
                }
              }
            });
            graphModelUpdated();
          }));
        }

        // find dynamic producers
        if ($scope.showFlags.producer) {
          containerJolokia.search("org.apache.activemq:endpoint=dynamicProducer,*", onSuccess((response) => {
            angular.forEach(response, (objectName) => {
              var details = Core.parseMBean(objectName);
              if (details) {
                var properties = details['attributes'];
                if (properties) {
                  configureDestinationProperties(properties);
                  var producerId = properties.producerId;
                  if (producerId) {
                    containerJolokia.request({type: 'read', mbean: objectName}, onSuccess((response) => {
                      var attributes = {};
                      if (response) {
                        attributes = response.value;
                        angular.forEach(attributes, (value, key) => {
                          properties[key] = value;
                        });
                        properties.destinationName = properties.destinationName || attributes["DestinationName"];
                      }
                      var destinationProperties = angular.copy(properties);
                      if (attributes["DestinationTemporary"] || attributes["DestinationTopc"]) {
                        destinationProperties.destType = "topic";
                      }
                      var destination = getOrAddDestination(destinationProperties);
                      if (destination) {
                        addLink(container.destinationLinkNode, destination, "destination");
                        var producer = getOrAddNode("producer", producerId, properties, () => {
                          return {
                            popup: {
                              title: "Producer (Dynamic): " + producerId,
                              content: "<p>client: " + (properties.clientId || "") + "</p> " + brokerNameMarkup(properties.brokerName)
                            }
                          };
                        });
                        addLink(producer, destination, "producer");
                      }
                      graphModelUpdated();
                    }));
                  }
                }
              }
            });
            graphModelUpdated();
          }));
        }

      }
    }

    function graphModelUpdated() {
      $scope.graph = graphBuilder.buildGraph();
      Core.$apply($scope);
    }

    function getOrAddNode(typeName:string, id, properties, createFn) {
      var node = null;
      if (id) {
        var nodeId = typeName + ":" + id;
        node = graphBuilder.getNode(nodeId);
        if (!node) {
          var nodeValues = createFn();
          node = angular.copy(properties);
          angular.forEach(nodeValues, (value, key) => node[key] = value);

          node['id'] = nodeId;
          if (!node['type']) {
            node['type'] = typeName;
          }
          if (!node['name']) {
            node['name'] = id;
          }
          if (node) {
            var size = $scope.shapeSize[typeName];
            if (size && !node['size']) {
              node['size'] = size;
            }
            // lets not add nodes which are defined as being disabled
            var enabled = $scope.showFlags[typeName];
            if (enabled || !angular.isDefined(enabled)) {
              //log.info("Adding node " + nodeId + " of type + " + typeName);
              graphBuilder.addNode(node);
            } else {
              //log.info("Ignoring node " + nodeId + " of type + " + typeName);
            }
          }
        }
      }
      return node;
    }

    function addLink(object1, object2, linkType) {
      if (object1 && object2) {
        var id1 = object1.id;
        var id2 = object2.id;
        if (id1 && id2) {
          graphBuilder.addLink(id1, id2, linkType);
        }
      }
    }

    /**
     * Avoid the JMX type property clashing with the ForceGraph type property; used for associating css classes with nodes on the graph
     *
     * @param properties
     */
    function renameTypeProperty(properties) {
      properties.mbeanType = properties['type'];
      delete properties['type'];
    }

    function configureDestinationProperties(properties) {
      renameTypeProperty(properties);
      var destinationType = properties.destinationType || "Queue";
      var typeName = destinationType.toLowerCase();
      properties.isQueue = !typeName.startsWith("t");
      properties['destType'] = typeName;
    }
  }
}