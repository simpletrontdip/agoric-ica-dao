// @ts-check
import { E } from '@endo/eventual-send';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx.js';
import { encodeBase64 } from '@endo/base64';

import { CosmosTx } from './src/package.js';

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

  const icaAddress = await E(actions).getIcaAddress();

  const sendMsg = MsgSend.fromPartial({
    amount: [{ denom: 'uatom', amount: '1000' }],
    fromAddress: icaAddress,
    toAddress: 'cosmos1h68l7uqw255w4m2v82rqwsl6p2qmkrg08u5mye',
  });

  const msgBytes = MsgSend.encode(sendMsg).finish();

  const comsosTx = CosmosTx.fromPartial({
    messages: [
      {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: msgBytes,
      },
    ],
  });
  const cosmosTxBytes = CosmosTx.encode(comsosTx).finish();
  const b64CosmosTxByte = encodeBase64(cosmosTxBytes);

  console.log('Here ==>', b64CosmosTxByte);

  const result = await E(actions).sendTxMsg(b64CosmosTxByte);

  console.log('Done, result', result);
}
