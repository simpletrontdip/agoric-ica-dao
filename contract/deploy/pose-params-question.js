// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { governor, paramQuestion, voteCounter } from './constants.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { zoe, scratch, chainTimerService } = await homeP;

  console.log('Getting from scratch');

  const [icaGovernorCreatorFacet, voteCounterInstall] = await Promise.all([
    E(scratch).get(`creatorFacet.${governor}`),
    E(scratch).get(`installation.${voteCounter}`),
  ]);

  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      IcarusConnection: 'connection-1',
    },
  });

  const votingDuration = 120n;
  const now = await E(chainTimerService).getCurrentTimestamp();
  const deadline = now + votingDuration;

  console.log('Posing question', paramChangeSpec, 'deadline', deadline);

  const { instance, outcomeOfUpdate } = await E(
    icaGovernorCreatorFacet,
  ).voteOnParamChanges(voteCounterInstall, deadline, paramChangeSpec);

  console.log('Writing details');
  const publicFacet = E(zoe).getPublicFacet(instance);

  await E(scratch).set(`publicFacet.${paramQuestion}`, publicFacet);

  const voteOutcomeP = E(publicFacet)
    .getOutcome()
    .then(outcome => console.log('vote outcome:', outcome))
    .catch(e => console.error('vote failed', e));

  const updateOutcomeP = E.when(outcomeOfUpdate, outcome =>
    console.log('==> updated to', outcome),
  ).catch(e => console.log('update failed', e));

  console.log('==> Waiting for vote outcome');
  await voteOutcomeP;
  await updateOutcomeP;

  console.log('Done');
}
