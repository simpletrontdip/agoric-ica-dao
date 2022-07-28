// @ts-check
import { Far } from '@endo/far';
import { assert, details as X } from '@agoric/assert';
import { encodeBase64 } from '@endo/base64';

import { CosmosTx, Any, Type } from './codec.js';

import '@agoric/pegasus/exported.js';

// As specified in ICS27, the success result is a base64-encoded '\0x1' byte.
const ICS27_ICA_SUCCESS_RESULT = 'AQ==';

/**
 * @param {string} s
 */
const safeJSONParseObject = s => {
  /** @type {unknown} */
  let obj;
  try {
    obj = JSON.parse(s);
  } catch (e) {
    assert.note(e, X`${s} is not valid JSON`);
    throw e;
  }
  assert.typeof(obj, 'object', X`${s} is not a JSON object`);
  assert(obj !== null, X`${s} is null`);
  return obj;
};

/**
 * Create an interchain transaction from a list of msgs
 *
 * @param {[AnyMsg]} msgs JSON transactions to be sent
 * @returns {Promise<string>}
 */
export const makeICS27ICAPacket = async (msgs, memo = '') => {
  const messages = Array.from(msgs).map(msg => Any.fromJSON(msg));
  const comsosTx = CosmosTx.fromPartial({
    messages,
  });
  const cosmosTxBytes = CosmosTx.encode(comsosTx).finish();

  // Generate the ics27-1 packet.
  /** @type {ICS27ICAPacket} */
  const ics27 = {
    type: Type.TYPE_EXECUTE_TX,
    data: encodeBase64(cosmosTxBytes),
    memo,
  };

  return JSON.stringify(ics27);
};

/**
 * Check the results of the packet.
 *
 * @param {string} ack
 * @returns {Promise<void>}
 */
export const assertICS27ICAPacketAck = async ack => {
  const { result, error, data } = safeJSONParseObject(ack);
  assert(error === undefined, `ICS27 ICA error ${error}`);
  assert(result !== undefined, `ICS27 ICA missing result in ${ack}`);
  if (result !== ICS27_ICA_SUCCESS_RESULT) {
    // We don't want to throw an error here, because we want only to be able to
    // differentiate between a packet that failed and a packet that succeeded.
    console.warn(`ICS27 ICA succeeded with unexpected result: ${result}`);
  }
  return data;
};

/** @type {ICAProtocol} */
export const ICS27ICAProtocol = Far('ics27-1 ICA protocol', {
  makeICAPacket: makeICS27ICAPacket,
  assertICAPacketAck: assertICS27ICAPacketAck,
});
