// @ts-check
import { E } from '@endo/eventual-send';

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

  console.log('Getting from home scratch');
  const [bridge] = await Promise.all([E(scratch).get('cosmoshubIcarusBridge')]);

  console.log('Registering ICA');
  const subscription = await E(bridge).register();

  console.log('Writing Subscription');
  await E(scratch).set('cosmoshubSubscription', subscription);

  console.log('Done');
}
