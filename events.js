var redis = require('redis')
var pub = redis.createClient();
var projectJoinedUser = new Map();
var debug = false;
var log = true;

var debugging = function(msg){
    if(debug){
        console.log(msg);
    }
}
var logging = function(obj){
    if(log){
        console.log(JSON.stringify(obj));
    }
}
var events = function(io){
    io.on('connection', function(socket){
        var sub = redis.createClient();
        var subscribedChannel = new Set();
        var userEmail = "";
        var projectID = "";

        // Subscribe to user channel
        socket.on('userChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                subscribedChannel.add(msg);
                userEmail = msg;
                sub.subscribe(msg);
                debugging(userEmail + " subscribe to user channel "+msg);
            }
        });

        // Subscribe to project channel
        socket.on('projectChannel', function(msg){
            if(!subscribedChannel.has(msg)){
                subscribedChannel.add(msg);
                projectID = msg;
                sub.subscribe(msg);
                debugging(userEmail + " subscribe to project channel "+msg);
            }
        });

        // Publish changes to user channel when a project is shared
        socket.on('shareProject', function(msg){
            debugging(userEmail + " on shareProject "+msg);
            pub.publish(msg["channel"], JSON.stringify(msg));
            var lmsg = {
                timestamp : Date.now(),
                user : userEmail,
                projectId : msg["project"],
                source : "Other",
                eventType: "share",
                shareTo: msg["channel"]
            }
            logging(lmsg);
        });

        // Publish changes to project channel when a user opens a project
        socket.on('userJoin', function(msg){
            debugging(userEmail+" on userJoin "+ msg);
            projectID = msg["project"];
            var joinedUsers;
            if(projectJoinedUser.has(msg["project"])){
                joinedUsers = projectJoinedUser.get(msg["project"]);
            }else{
                joinedUsers = new Set();
                projectJoinedUser.set(msg["project"], joinedUsers);
            }
            joinedUsers.add(msg["user"]);
            joinedUsers.forEach(function(e){
                var pubMsg = {
                    "project": msg["project"],
                    "type" : "join",
                    "user" : e
                };
                socket.emit(msg["project"], JSON.stringify(pubMsg));
            });
            var pubSelf = {
                "project": msg["project"],
                "type" : "join",
                "user" : userEmail
            };
            if(msg["project"]){
                pub.publish(msg["project"], JSON.stringify(pubSelf));
                var lmsg = {
                    timestamp : Date.now(),
                    user : userEmail,
                    projectId : msg["project"],
                    source : "Other",
                    eventType: "user.join"
                }
                logging(lmsg);
            }
        });
        // Publish changes to project channel when a user closes a project
        socket.on('userLeave', function(msg){
            debugging(userEmail+" on userLeave "+ msg);
            projectID = "";
            var pubMsg = {
                "project": msg["project"],
                "type" : "leave",
                "user" : msg["user"]
            };
            if(projectJoinedUser.has(msg["project"])){
                projectJoinedUser.get(msg["project"]).delete(msg["user"]);
            }
            if(msg["project"]){
                pub.publish(msg["project"], JSON.stringify(pubMsg));
                var lmsg = {
                    timestamp : Date.now(),
                    user : userEmail,
                    projectId : msg["project"],
                    source : "Other",
                    eventType: "user.leave"
                }
                logging(lmsg);
            }
        });

        socket.on('leader', function(msg){
            debugging(userEmail+" on leader "+msg);
            var pubMsg = {
                "project" : msg["project"],
                "type" : "leader",
                "user" : msg["user"],
                "leader" : msg["leader"],
                "leaderEmail" : msg["leaderEmail"]
            };
            pub.publish(msg["project"], JSON.stringify(pubMsg));
        });

        // Publish changes to screen channel when blocks changed
        socket.on('block', function(msg){
            msg['timestamp'] = Date.now().toString();
            var proj = msg["channel"].split("_")[0];
            if (proj !== projectID) {
                return;
            }
            pub.publish(proj, JSON.stringify(msg));
            debugging(userEmail+" on block "+ msg);
            var evt = msg["event"];
            var lmsg = {
                timestamp: Date.now(),
                user: userEmail,
                projectId: proj,
                source: 'Block',
                eventType: evt['type'],
                blockId: evt['blockId']
            };
            switch (evt["type"]) {
            case "move":
                lmsg['parentId'] = evt['newParentId'];
                break;
            case "change":
                lmsg['propertyName'] = evt['name'];
                break;
            default:
                break;
            }
            lmsg['event'] = evt;
            logging(lmsg);
        });

        // Designer events
        socket.on('component', function(msg){
            msg['timestamp'] = Date.now().toString();
            var proj = msg["channel"].split("_")[0];
            if (proj !== projectID) {
                return;
            }
            pub.publish(proj, JSON.stringify(msg));
            debugging(userEmail+" on component "+ msg);
            var evt = msg["event"];
            var lmsg = {
                timestamp: Date.now(),
                user: userEmail,
                projectId: evt['projectId'],
                source: 'Designer',
                eventType: evt['type'],
                componentId: evt['componentId'],
            };
            switch (evt["type"]) {
            case "component.move":
                lmsg['parentId'] = evt['parentId'];
                break;
            case "component.property":
                lmsg['propertyName'] = evt['property'];
                break;
            default:
                break;
            }
            lmsg['event'] = evt;
            logging(lmsg);
        });

        /**
         * project endpoint:
         * Message types:
         * - save: Sent when the project is saved (either manually or automatically)
         */
        socket.on('project', function(msg) {
            var lmsg = {
                timestamp: Date.now(),
                user: userEmail,
                projectId: msg['project'],
                type: msg['type']
            };
            logging(lmsg);
        });

        socket.on('screen', function(msg) {
            pub.publish(msg['project'], JSON.stringify(msg));
            var lmsg = {
                timestamp: Date.now(),
                user: userEmail,
                projectId: msg['project'],
                source: 'DesignToolbar',
                event: msg['event']
            };
            logging(lmsg);
        });

        // publish latest status
        socket.on("status", function(msg){
            pub.publish(msg["channel"], JSON.stringify(msg));
        });
        // get status from others
        socket.on("getStatus", function(msg){
            pub.publish(msg["channel"], JSON.stringify(msg));
        });

        // file upload
        socket.on("file", function(msg){
            let timestamp = Date.now();
            pub.publish(msg["projectId"], JSON.stringify(msg));
            let lmsg = {
                timestamp: timestamp,
                user: userEmail,
                projectId: msg['projectId'],
                type: msg['type'],
                event: msg
            };
            logging(lmsg);
        });

        // extensions
        socket.on('extension', function(msg) {
            let timestamp = Date.now();
            pub.publish(msg['projectId'], JSON.stringify(msg));
            let lmsg = {
                timestamp: timestamp,
                user: userEmail,
                projectId: msg['projectId'],
                type: msg['type'],
                event: msg
            };
            logging(lmsg);
        });

        // receive subscribe message
        sub.on('message', function(ch, msg){
            debugging(userEmail + " receive message on "+ch+" msg: "+msg);
            socket.emit(ch, msg);
        });

        //disconnection
        socket.on("disconnect", function(){
            debugging(userEmail+" connection is off");
            var pubMsg = {
                "project": projectID,
                "type" : "leave",
                "user" : userEmail
            };
            if(projectJoinedUser.has(projectID)){
                projectJoinedUser.get(projectID).delete(userEmail);
            }
            if(projectID!=""){
                pub.publish(projectID, JSON.stringify(pubMsg));
                var lmsg = {
                    timestamp : Date.now(),
                    user : userEmail,
                    projectId : projectID,
                    source : "Other",
                    eventType: "user.leave"
                }
                logging(lmsg);
                projectID = "";
            }
        });
    });
}

module.exports = events;
