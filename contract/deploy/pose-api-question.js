// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { governor, apiQuestion, voteCounter } from './constants.js';

const options = {
  method: 'sendDelegate',
  params: [
    {
      denom: 'uatom',
      amount: '1000',
      validatorAddress: 'cosmosvaloper10v6wvdenee8r9l6wlsphcgur2ltl8ztkfrvj9a',
    },
  ],
};

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

  const votingDuration = 120n;
  const now = await E(chainTimerService).getCurrentTimestamp();
  const deadline = now + votingDuration;

  const apiMethodName = options.method;
  const apiCallParams = options.params;

  console.log(
    'Posing question',
    apiMethodName,
    'params',
    apiCallParams,
    'deadline',
    deadline,
  );

  const { instance, outcomeOfUpdate } = await E(
    icaGovernorCreatorFacet,
  ).voteOnApiInvocation(
    options.method,
    options.params,
    voteCounterInstall,
    deadline,
  );

  console.log('Writing details');
  const publicFacet = E(zoe).getPublicFacet(instance);

  await E(scratch).set(`publicFacet.${apiQuestion}`, publicFacet);

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
