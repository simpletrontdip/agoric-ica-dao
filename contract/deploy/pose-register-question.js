// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import {
  governor,
  registerQuestion,
  voteCounter,
  governedIca,
} from './constants.js';

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

  const connectionParams = harden([
    {
      hostPortId: 'icahost',
      controllerConnectionId: 'connection-0',
      hostConnectionId: 'connection-855',
    },
  ]);

  const votingDuration = 120n;
  const now = await E(chainTimerService).getCurrentTimestamp();
  const deadline = now + votingDuration;

  console.log(
    'Posing registerAccount question',
    connectionParams,
    'deadline',
    deadline,
  );

  const { instance, outcomeOfUpdate } = await E(
    icaGovernorCreatorFacet,
  ).voteOnApiInvocation(
    'registerAccount',
    connectionParams,
    voteCounterInstall,
    deadline,
  );

  console.log('Writing details');
  const publicFacet = E(zoe).getPublicFacet(instance);

  await E(scratch).set(`publicFacet.${registerQuestion}`, publicFacet);

  const voteOutcomeP = E(publicFacet)
    .getOutcome()
    .then(outcome => console.log('vote outcome:', outcome))
    .catch(e => console.error('vote failed', e));

  const updateOutcomeP = E.when(outcomeOfUpdate, outcome =>
    console.log('account register succeeded', outcome),
  ).catch(e => console.log('account register failed', e));

  console.log('==> Waiting for vote outcome');
  await voteOutcomeP;
  await updateOutcomeP;

  const icaDaoPublicFacet = await E(scratch).get(`publicFacet.${governedIca}`);

  const [portId, remoteAddress] = await Promise.all([
    E(icaDaoPublicFacet).getPortId(),
    E(icaDaoPublicFacet).getAddress(),
  ]);
  console.log('Port Id', portId, 'Addr', remoteAddress);

  console.log('Done');
}
