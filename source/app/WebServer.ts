// tslint:disable-next-line:no-reference
/// <reference path="./global.d.ts" />

import './../utils/requireOverride';
import { BaseServer } from '~server/lib/BaseServer';
import { LocalStorage } from "node-localstorage";

// Declare local storage to have the same behavior on server like the client
global.localStorage = new LocalStorage("./localStorage");

/**
 * This will be the server for the website
 *
 * @class WebServer
 * @extends {BaseServer}
 */
class WebServer extends BaseServer { }

const webServer = new WebServer();
webServer.start();
