

angular.module('Buddycloud', [])

    .directive('buddycloud', function(){
      return {
        'restrict': 'E',
        'scope': {
          'node': '@',
          'jid': '=',
          'changenode': '&changenode'
        },
        'transclude': false,
        'templateUrl': 'directives/buddycloud/template.html',
        'controller': function($scope,Xmpp){
            var socket=Xmpp.socket;
            $scope.newitems = {};

            $scope.opennode=function(name){
                 console.log(name);
                var localname=name.substring(0,name.indexOf("@"));
                var domain=name.substring(name.indexOf("@")+1);
                console.log(localname,domain);

                var node={
                        node:"/user/"+localname+"@"+domain+"/posts",
                        name:localname  
                }
                $scope.changenode({node:node});
                console.log({node:node});
            }

            $scope.create = function() {
                var node="/user/"+$scope.newnode+"@laos.buddycloud.com/posts";
                socket.send(
                    'xmpp.buddycloud.create', {
                        "node": node,
                        "options": [
                            {"var": "buddycloud#channel_type", "value": "topic" }, 
                            {"var": "pubsub#title", "value": "Juliet's posts node" }, 
                            {"var": "pubsub#access_model", "value": "open" },
                            {"var": "buddycloud#default_affiliation", value : "publisher" }
                        ]
                    },
                    function(error, data) {
                        console.log(error, data)
                    }
                );
                console.log("created");
            }


                //Buddycloud timeline

                $scope.getNodeItems = function(node) {
                    console.log('Retrieving node items')
                    //var node='/user/team@topics.buddycloud.org/posts';
                    socket.send(
                        'xmpp.buddycloud.retrieve', {
                            node: node,
                            rsm: {
                                max: 55
                            }
                        },
                        function(error, data) {
                            //            $scope.items=data;
                            $scope.tree = $scope.maketree(data);
                            $scope.$apply();
                        }
                    )

                }





            $scope.maketree = function(data) {
                console.log("maketree", data);
                var tree = {};
                if(!data)return tree;
                for (var i = 0; i < data.length; i++) {
                    data[i].entry.atom.author.image=data[i].entry.atom.author.name.split("@")[0];
                    var ar = data[i].entry.atom.id.split(",");
                    var id = ar.pop();

                    if (data[i].entry["in-reply-to"]) {
                        var ref = data[i].entry["in-reply-to"].ref;
                        var item = tree[ref];
                        if (item) {
                            if (!item.nodes) item.nodes = [];
                            item.nodes.push(data[i]);
                        }
                    } else {
                        tree[id] = data[i];
                    }
                }
                return tree;
            }


            console.log("----wait for connection ---");
//            socket.on('xmpp.connection', function(data) {
                console.log("+++connected+++");
                $scope.connected=true;
                //presence
                socket.send('xmpp.buddycloud.presence', {});



                
                //buddycloud message listener

                socket.on('xmpp.buddycloud.push.item', function(data) {
                    console.log("==================", data.node);
                    if(data.node==$scope.node){
                        var ar = data.id.split(",");
                        var id = ar[ar.length - 1];
                        console.log("id", id);
                        data.entry.atom.author.image=data.entry.atom.author.name.split("@")[0];
                        if (data.entry["in-reply-to"]) {
                            var ref = data.entry["in-reply-to"].ref;
                            console.log("ref", ref);
                            if (!$scope.tree[ref].nodes) $scope.tree[ref].nodes = [];
                            $scope.tree[ref].nodes.push(data);
                        } else {
                            $scope.tree[id] = data;
                        }
                        $scope.$apply();
                    }
                });
                socket.on('xmpp.buddycloud.item.delete', function(data) {
                    console.log("deleting",arguments);
                });

                //subscribe to node

                $scope.subscribe = function() {
                    socket.send(
                        'xmpp.buddycloud.subscribe',
                        {
                            "node": $scope.node
                        },
                        function(error, data) { console.log(error, data) }
                    )
                }

                //unsubscribe from node

                $scope.unsubscribe = function() {
                    socket.send(
                        'xmpp.buddycloud.unsubscribe',
                        {
                            "node": $scope.node
                        },
                        function(error, data) { console.log(error, data) }
                    )
                }



                //Buddycloud delete - not working

                $scope.removeitem = function(ref) {
                    console.log("delete", ref,node);
                    var ar = ref.split(",");
                    var id = ar[ar.length - 1];
                    var stanza = {
                        node:node,
                        id: id
                    };
                    socket.send(
                        'xmpp.buddycloud.item.delete', stanza,
                        function(error, data) {
                            if (error) console.error(error);
                            else {
                                console.log("deleted .", data);
                            }
                        });

                }

                //Buddycloud publish

                $scope.publish = function(ref) {
                    console.log(ref);
                    console.log("publishing: ", $scope.newmessage);
                    if (ref) {
                        var text = $scope.newitems[ref];
                    } else {
                        var text = $scope.newtopic;
                    }
                    var stanza = {
                        "node": $scope.node,
                        "content": {
                            "atom": {
                                "content": text
                            }
                        }
                    };
                    if (ref) {
                        stanza.content["in-reply-to"] = {
                            "ref": ref
                        }
                    }
                    socket.send(
                        'xmpp.buddycloud.publish', stanza,
                        function(error, data) {
                            if (error) console.error(error);
                            else {
                                $scope.newitems[ref] = "";
                                console.log("Message sent.");
                            }
                        }
                    );







//            });  //connect


            }



        },
        'link': function(scope, element, attrs){
            console.log("dada",attrs.node);
            scope.node = attrs.node;
            scope.getNodeItems(scope.node);
            scope.$watch("node",function(){
                console.log("changed");
                scope.getNodeItems(scope.node);
            });
        }
      };
    })

    .filter('toArray', function () {
        'use strict';
     
        return function (obj) {
            if (!(obj instanceof Object)) {
                return obj;
            }
     
            return Object.keys(obj).filter(function(key){if(key.charAt(0) !== "$") {return key;}}).map(function (key) {
                return Object.defineProperty(obj[key], '$key', {__proto__: null, value: key});
            });
        };
    });
