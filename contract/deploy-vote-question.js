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

  const [committeeCreatorFacet, questionDetailsP] = await Promise.all([
    E(scratch).get('committeeCreatorFacet'),
    E(scratch).get('icaQuestionDetails'),
  ]);

  const [invitations, questionDetails] = await Promise.all([
    E(committeeCreatorFacet).getVoterInvitations(),
    questionDetailsP,
  ]);

  const { positions, questionHandle } = questionDetails;

  const voterSeat = E(zoe).offer(invitations[0]);
  const voterFacet = E(voterSeat).getOfferResult();

  const choice = positions[0];
  await E(voterFacet).castBallotFor(questionHandle, [choice]);

  console.log('Done');
}
