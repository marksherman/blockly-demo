# Realtime Collaboration Server for App Inventor

This package is a node.js server for handling message-passing between multiple clients collaborating on a single App Inventor project.

## Quickstart

### Prerequisites

You will need to install the following dependencies via your system package manager:

1. node
2. npm
3. redis

A Redis server must be running alongside the realtime collaboration server. App Inventor leverages the pubsub capabilities of Redis to notify users of changes in a project.

### Installation

The server is written in node and its dependencies are managed with npm. Setting up the server requires only:

```shell
$ npm install
```

### Running

The server provides a start script to launch it using npm:

```shell
$ npm start
```

The server logs all messages to stdout with one JSON-serialized packet per line. The data can be directed to a file, or `/dev/null` if not required.

## Technical Overview

The service uses the [socket.io](https://socket.io) JavaScript library to handle communication with the client. Where available, this will default to WebSockets, with a fallback to long-polling HTTP requests.

### Channels

The following channels are used for peer-to-peer communication:

__userChannel__: Associates a user with the socket.

__projectChannel__: Subscribes the user to the given project channel.

__screenChannel__: Subscribes the user to the channel associated with a specific screen. Note that a screen name is actually a `<projectId>_<screenName>` string that uniquely identifies a screen.

__shareProject__: Sends a message to User A when a project is shared by User B. The project list of User A's session will be refreshed to reflect the new project.

__userJoin__: Notifies all users subscribed to the given project channel of a new user having opened the project.

__userLeave__: Notifies all users subscribed to the given project channel of a user leaving the project.

__leader__: Used in the _Project Leader_ condition to notify users of the current project leader.

__block__: Changes to the blocks workspace are transmitted via this channel.

__component__: Changes to the designer workspace are transmitted via this channel.

__project__: Used to send status information about a project. At present, this is only used to log autosave events to the collaboration server to synchronize time with the backup storage.

__screen__: Used to notify of add/remove screen events.

__status__: Used to report changes in component/block locking in the _Component Locking_ condition.

__getStatus__: Used to request the locked status from each user in the _Component Locking_ condition.

__file__: Notification channel used to inform other users that new media files have been uploaded to the project.

__message__: Currently unused--defined by socket.io.


