// @ts-check
import { E } from '@endo/eventual-send';
import { observeIteration } from '@agoric/notifier';
import { makePromiseKit } from '@endo/promise-kit';

import '@agoric/zoe/exported';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deployContract(
  homeP,
  // { bundleSource, pathResolve },
) {
  const { scratch } = await homeP;

  console.log('Getting from home scratch');
  const [bridge] = await Promise.all([E(scratch).get('cosmoshubIcarusBridge')]);

  console.log('Registering ICA');
  const subscription = await E(bridge).register();
  const kit = makePromiseKit();

  console.log('Observing Subscription');
  observeIteration(subscription, {
    async updateState(connectionState) {
      const { localAddr, remoteAddr, actions } = connectionState;
      if (actions) {
        console.log('Connected', { localAddr, remoteAddr });
        await E(scratch).set('cosmoshubIcaState', connectionState);

        console.log('My address', await E(actions).getIcaAddress());
        kit.resolve('Done');
      } else {
        // We're closed.
        console.log('Disconnected');
        await E(scratch).set('cosmoshubIcaState', null);
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
