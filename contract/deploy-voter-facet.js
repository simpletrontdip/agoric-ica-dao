// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch } = await homeP;

  console.log('Getting from scratch');

  const committeeCreatorFacet = await E(scratch).get('committeeCreatorFacet');

  const invitations = await E(committeeCreatorFacet).getVoterInvitations();
  const voterSeat = E(zoe).offer(invitations[2]);
  const voterFacet = E(voterSeat).getOfferResult();

  console.log('Updating to scratch');
  await E(scratch).set('icaVoterFacet', voterFacet);

  console.log('Done');
}
