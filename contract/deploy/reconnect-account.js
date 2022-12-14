// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { governedIca } from './constants.js';

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

  const portId = await E(icaDaoPublicFacet).getPortId();
  console.log('Port Id', portId);

  console.log('Reconnecting remote account');
  await E(icaDaoCreatorFacet).reconnectAccount();

  console.log('Done');
}
