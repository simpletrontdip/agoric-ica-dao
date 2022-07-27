// @ts-check
import { E } from '@endo/eventual-send';
import { observeIteration } from '@agoric/notifier';
import { makePromiseKit } from '@endo/promise-kit';

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
  const kit = makePromiseKit();

  console.log('Observing Subscription');

  const subscription = await E(scratch).get('cosmoshubSubscription');

  observeIteration(subscription, {
    async updateState(connectionState) {
      const { localAddr, remoteAddr, actions } = connectionState;
      if (actions) {
        console.log('Connected', { localAddr, remoteAddr });
        await E(scratch).set('cosmoshubIcaActions', actions);

        console.log('My address', await E(actions).getIcaAddress());
        kit.resolve('Done');
      } else {
        // We're closed.
        console.log('Disconnected');
        await E(scratch).set('cosmoshubIcaActions', null);
      }
    },
    async fail(error) {
      console.log('Error', error);
      kit.reject(error);
    },
  });

  await kit.promise;
  console.log('Done');
}
