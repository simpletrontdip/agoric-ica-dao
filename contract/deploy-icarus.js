// @ts-check
import { E } from '@endo/eventual-send';
import { deeplyFulfilled } from '@endo/marshal';

import '@agoric/zoe/exported.js';

const specs = {
  hostChainId: 'theta-testnet-001',
  hostConnectionId: 'connection-792',
  hostPortId: 'icahost',
  controllerConnectionId: 'connection-1',
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, networkVat, icarusStorage } = await homeP;

  // install Icarus, later this will be done on-chain
  const bundle = await bundleSource(pathResolve(`./src/icarus/icarus.js`));
  const installation = await E(zoe).install(bundle);

  const terms = harden({
    networkVat: await networkVat,
    icarusStorage: await icarusStorage,
  });

  // start instance
  console.log('Starting instance');
  const { instance, publicFacet, creatorFacet } = await E(zoe).startInstance(
    installation,
    undefined,
    terms,
  );

  // make bridge
  console.log('Making bridge', specs.hostChainId);
  const bridge = await E(creatorFacet).makeIcarusBridge(specs);

  console.log('Writing to home scratch');
  await Promise.all([
    E(scratch).set('icarusPublicFacet', publicFacet),
    E(scratch).set('icarusCreatorFacet', creatorFacet),
    E(scratch).set('icarusInstance', instance),
    E(scratch).set('cosmoshubIcarusBridge', bridge),
  ]);

  console.log('Done');
}
