// @ts-check
import { Far } from '@endo/far';
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

const options = {
  members: [],
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, namesByAddress } = await homeP;

  const charterBundle = await bundleSource(pathResolve(`./src/charter.js`));
  const charterInstall = await E(zoe).install(charterBundle);

  const binaryVoteBundle = await bundleSource(
    pathResolve(`@agoric/governance/src/binaryVoteCounter.js`),
  );
  const binaryVoteInstall = await E(zoe).install(binaryVoteBundle);

  const [icaGovernorCreatorFacet, committeeCreatorFacet] = await Promise.all([
    E(scratch).get('icaGovernorCreatorFacet'),
    E(scratch).get('committeeCreatorFacet'),
  ]);

  const terms = harden({
    voteCounter: binaryVoteInstall,
  });
  const privateArgs = harden({
    ica: icaGovernorCreatorFacet,
  });

  const { publicFacet: votingAPI } = await E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    privateArgs,
  );

  const charterAdmintFacet = Far('charterAdmin', {
    async inviteMembers(members = options.members) {
      console.log('Sending invitations to commitee members');
      const invitations = await E(committeeCreatorFacet).getVoterInvitations();
      assert.equal(invitations.length, members.length);

      return Promise.all(
        members.map(async (addr, idx) => {
          console.log('Sending to', addr);
          const depositFacet = E(namesByAddress).lookup(addr, 'depositFacet');

          const [voterInvitation, nullInvitation] = await Promise.all([
            invitations[idx],
            E(votingAPI).makeNullInvitation(),
          ]);

          // receive payments
          await Promise.all([
            E(depositFacet).receive(nullInvitation),
            E(depositFacet).receive(voterInvitation),
          ]);
        }),
      );
    },
  });

  console.log('Writing voting api');

  await Promise.all([
    E(scratch).set('icaCharterVotingApi', votingAPI),
    E(scratch).set('icaCharterAdminFacet', charterAdmintFacet),
  ]);

  console.log('Done');
}
