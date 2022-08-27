// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { question } from './constants.js';

const options = {
  voteChange: true,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { scratch } = await homeP;

  console.log('Getting from scratch');

  const [questionPublicFacet, voterFacet] = await Promise.all([
    E(scratch).get(`publicFacet.${question}`),
    E(scratch).get('icaVoterFacet'),
  ]);

  const [isOpen, questionDetails] = await Promise.all([
    E(questionPublicFacet).isOpen(),
    E(questionPublicFacet).getDetails(),
  ]);

  const {
    positions,
    questionHandle,
    quorumRule,
    closingRule,
  } = questionDetails;
  const choice = positions[options.voteChange ? 0 : 1];

  console.log(
    'Voting ====>',
    'isOpen',
    isOpen,
    'deadline',
    closingRule.deadline,
    'options',
    positions,
    'rule',
    quorumRule,
  );
  console.log('===> Choice', choice);

  await E(voterFacet).castBallotFor(questionHandle, [choice]);

  console.log('Done');
}
