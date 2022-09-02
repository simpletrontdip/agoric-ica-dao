// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { governedIca } from './constants.js';

const options = {
  isReconnect: false,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */
export default async function deploy(homeP) {
  const { scratch } = await homeP;

  const [icaDaoCreatorFacet, icaDaoPublicFacet] = await Promise.all([
    E(scratch).get(`creatorFacet.${governedIca}`),
    E(scratch).get(`publicFacet.${governedIca}`),
  ]);

  console.log('Checking current params');
  const params = await E(icaDaoPublicFacet).getGovernedParams();
  const connectionParams = params.IcarusConnectionParams.value;

  console.log('Connection params', connectionParams);

  if (options.isReconnect) {
    console.log('Reconnecting remote account');
    await E(icaDaoCreatorFacet).reconnectAccount();
  } else {
    console.log('Registering remote account');
    await E(icaDaoCreatorFacet).registerAccount();
  }

  console.log('Done');
}
