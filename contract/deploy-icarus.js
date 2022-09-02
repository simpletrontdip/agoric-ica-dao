// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, networkVat } = await homeP;

  // install Icarus, later this will be done on-chain
  const bundle = await bundleSource(pathResolve(`./src/icarus/icarus.js`));
  const installation = await E(zoe).install(bundle);

  const privateArgs = harden({
    networkVat: await networkVat,
  });

  // start instance
  console.log('Starting instance');
  const { instance, publicFacet } = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    privateArgs,
  );

  console.log('Writing to home scratch');
  await Promise.all([
    E(scratch).set('icarusPublicFacet', publicFacet),
    E(scratch).set('icarusInstance', instance),
  ]);

  console.log('Done');
}
