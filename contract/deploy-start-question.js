// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, chainTimerService } = await homeP;

  console.log('Getting from scratch');
  const binaryVoteBundle = await bundleSource(
    pathResolve(`@agoric/governance/src/binaryVoteCounter.js`),
  );
  const binaryVoteInstall = await E(zoe).install(binaryVoteBundle);

  const [icaGovernorCreatorFacet, committeeCreatorFacet] = await Promise.all([
    E(scratch).get('icaGovernorCreatorFacet'),
    E(scratch).get('committeeCreatorFacet'),
  ]);

  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      IcarusConnection: 'Connection-1',
    },
  });

  const votingDuration = 30n;
  const now = await E(chainTimerService).getCurrentTimestamp();
  const deadline = now + votingDuration;

  const { details, instance, outcomeOfUpdate } = await E(
    icaGovernorCreatorFacet,
  ).voteOnParamChanges(binaryVoteInstall, deadline, paramChangeSpec);

  console.log('Writing question details');
  await E(scratch).set('icaQuestionDetails', details);

  const publicFacet = E(zoe).getPublicFacet(instance);
  const voteOutcomeP = E(publicFacet)
    .getOutcome()
    .then(outcome => console.log(`vote outcome: ${outcome}`))
    .catch(e => console.error(`vote failed ${e}`));

  const updateOutcomeP = E.when(outcomeOfUpdate, outcome =>
    console.log(`updated to (${outcome})`),
  ).catch(e => console.log(`update failed: ${e}`));

  // await voteOutcomeP;
  // await updateOutcomeP;

  console.log('Done');
}
