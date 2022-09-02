// @ts-check
/// <reference types="ses"/>

import '@agoric/swingset-vat/src/vats/network/types.js';

/**
 * @typedef {object} AnyMsg
 * @property {string} typeUrl
 * @property {string} value base64 encoded string of Uinit8Array of the underlying transaction msg
 */

/**
 * @typedef {object} ICAProtocol
 * @property {(msgs: [AnyMsg]) => Promise<string>} makeICAPacket
 * @property {(ack: string) => Promise<void>} assertICAPacketAck
 */

/**
 * @typedef {object} ICS27ICAPacket
 * @property {number} type The int32 type of the transaction (ICA only supports Type 1)
 * @property {string} data The byte encoding of a list of messages in {Type: xxx, Value: {}} format
 * @property {string} memo Optional memo for the tx. Defaults to blank ""
 */

/**
 * @typedef ConnectParams
 * @property {string} hostPortId
 * @property {string} hostConnectionId
 * @property {string} controllerConnectionIds
 */

/**
 * @typedef ReconnectParams
 * @property {string} hostConnectionId
 * @property {string} controllerConnectionIds */

/**
 * @typedef {object} IcarusConnectionActions
 * @property {() => object} state: get interchain account state
 * @property {() => boolean} isReady: is ready to send tx message
 * @property {() => string} geAddress: get host chain account address
 * @property {(params: ReconnectParams) => void} reconnect: reconnect, for case connection timeout or underlying error
 * @property {(msgs: [AnyMsg]) => Promise<any>} sendTxMsgs: send transaction to host chain
 */

/**
 * @typedef RegisterAccountResult
 * @property {IcarusConnectionActions} icaActions
 * @property {Subscription<object>} subscription:
 *
 *
 * @typedef {object} IcarusControllerActions
 * @property {() => Port} getPort: get assigned Port of account controller
 * @property {() => string} getPortId: get assigned Port Id of account controller
 * @property {(params: ConnectParams) => RegisterAccountResult} makeRemoteAccount: register account on remote chain
 */

/**
 * @typedef {object} Icarus
 * @property {() => Promise<IcarusControllerActions>} newController: assign a Port and create an ICA Controller ready for ICA
 * @property {(port: Port) => Promise<IcarusControllerActions>} makeController: create an ICA Controller from an assigned Port, for case of upgrading
 */
