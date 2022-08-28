// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

const specs = {
  hostChainId: 'theta-testnet-001',
  hostConnectionId: 'connection-809',
  hostPortId: 'icahost',
  controllerConnectionId: 'connection-0',
};

const overrideController = true;

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { scratch } = await homeP;

  console.log('Getting from home scratch');
  const icarus = await E(scratch).get('icarusPublicFacet');
  let controller = await E(scratch).get('icaController');

  if (!controller || overrideController) {
    console.log('Creating new controller');
    controller = await E(icarus).newController();
  }
  const portId = await E(controller).getPortId();

  console.log('Creating new account', portId, specs);
  const { icaActions, subscription } = await E(controller).makeRemoteAccount(
    specs,
  );

  console.log('Account addr', await E(icaActions).getAddress());

  console.log('Writing to scratch');
  await Promise.all([
    E(scratch).set('icaController', controller),
    E(scratch).set('cosmoshubSubscription', subscription),
    E(scratch).set('cosmoshubIcaActions', icaActions),
  ]);

  console.log('Done');
}
