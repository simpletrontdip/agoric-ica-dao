// @ts-check
import { E } from '@endo/eventual-send';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx.js';
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import { Any } from 'cosmjs-types/google/protobuf/any.js';

import '@agoric/zoe/exported.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(
  homeP,
  // { bundleSource, pathResolve },
) {
  const { scratch } = await homeP;

  console.log('Getting actions from home scratch');
  const actions = await E(scratch).get('cosmoshubIcaActions');

  const icaAddress = await E(actions).getAddress();

  const sendMsg = MsgSend.fromPartial({
    amount: [{ denom: 'uatom', amount: '1000' }],
    fromAddress: icaAddress,
    toAddress: 'cosmos1h68l7uqw255w4m2v82rqwsl6p2qmkrg08u5mye',
  });

  const sendMsgBytes = MsgSend.encode(sendMsg).finish();

  const delegateMsg = MsgDelegate.fromPartial({
    amount: { denom: 'uatom', amount: '1000' },
    delegatorAddress: icaAddress,
    validatorAddress: 'cosmosvaloper10v6wvdenee8r9l6wlsphcgur2ltl8ztkfrvj9a',
  });

  const delegateMsgBytes = MsgDelegate.encode(delegateMsg).finish();

  const txMsgs = [
    {
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: sendMsgBytes,
    },
    {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: delegateMsgBytes,
    },
  ];

  console.log('Serializing tx messages');
  const txMsgsJson = txMsgs.map(m => Any.toJSON(m));

  // send the json encoded
  console.log('Sending...');
  const result = await E(actions).sendTxMsgs(txMsgsJson);

  console.log('Done, result', result);
}
