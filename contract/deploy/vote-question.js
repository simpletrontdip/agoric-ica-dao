// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { registerQuestion, apiQuestion } from './constants.js';

const options = {
  voteChange: true,
  question: apiQuestion,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { scratch } = await homeP;
  const question = options.question;

  console.log('Getting from scratch');

  const [questionPublicFacet, voterFacet1, voterFacet2] = await Promise.all([
    E(scratch).get(`publicFacet.${question}`),
    E(scratch).get('icaVoterFacet1'),
    E(scratch).get('icaVoterFacet2'),
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

  await Promise.all([
    E(voterFacet1).castBallotFor(questionHandle, [choice]),
    E(voterFacet2).castBallotFor(questionHandle, [choice]),
  ]);

  console.log('Done');
}
