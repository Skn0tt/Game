// tslint:disable-next-line:no-reference
/// <reference path="./global.d.ts" />

import './../utils/requireOverride';
import { WebSocketServer } from '~server/lib/WebSocketServer';
import { Request } from 'express';
import { LocalStorage } from "node-localstorage";

// Declare local storage to have the same behavior on server like the client
global.localStorage = new LocalStorage("./localStorage");

/**
 * This server serves a static html page to the client which initializes
 * the webGL game environment.
 *
 * @class GameServer
 * @extends {BaseServer}
 */
class GameServer extends WebSocketServer {
    /**
     * @inheritdoc
     *
     * @protected
     * @param {Request} request
     * @returns {Promise<boolean>}
     * @memberof GameServer
     */
    protected async verifyWebSocketClient(_request: Request): Promise<boolean> {
        return true;
    }
}

const gameServer = new GameServer();
gameServer.start();
