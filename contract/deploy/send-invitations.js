// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { committee } from './constants.js';

const options = {
  members: [
    'agoric1452ajyrfczrasgwgyjmvw4cgm3v8n5t0jfxu9x',
    'agoric1452ajyrfczrasgwgyjmvw4cgm3v8n5t0jfxu9x',
  ],
  waitForDeposit: true,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { scratch, namesByAddress } = await homeP;

  const members = options.members;
  const committeeCreatorFacetP = E(scratch).get(`creatorFacet.${committee}`);
  const invitations = await E(committeeCreatorFacetP).getVoterInvitations();

  assert(
    invitations.length > members.length,
    'Member list should be smaller than committee size',
  );

  console.log('Sending invitations');
  const promises = members.map(async (addr, idx) => {
    console.log('Sending to', addr);
    const depositFacet = E(namesByAddress).lookup(addr, 'depositFacet');

    const voterInvitation = await invitations[idx];
    // receive payments
    return E(depositFacet).receive(voterInvitation);
  });

  if (options.waitForDeposit) {
    await Promise.all(promises);
  }

  console.log('Done');
}
