// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { icarus } from './constants.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { zoe, scratch, networkVat } = await homeP;

  const installation = await E(scratch).get(`installation.${icarus}`);

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
    E(scratch).set(`publicFacet.${icarus}`, publicFacet),
    E(scratch).set(`instance.${icarus}`, instance),
  ]);

  console.log('Done');
}
