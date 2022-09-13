// @ts-check
import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

import '@agoric/zoe/exported.js';
import { committee } from './constants.js';

const options = {
  pursePetName: 'Default Zoe invite purse',
  overrideExisting: false,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { zoe, wallet, scratch } = await homeP;
  const existing = await E(scratch).get('icaVoterFacet');

  if (existing && !options.overrideExisting) {
    console.log(
      'icaVoterFacet existed, you need to update `override` flag to proceed',
      '\nDone, do nothing',
    );
    return;
  }

  const [invitationPurse, committeeInstance] = await Promise.all([
    E(E(wallet).getAdminFacet()).getPurse(options.pursePetName),
    E(scratch).get(`instance.${committee}`),
  ]);

  const totalAmount = await E(invitationPurse).getCurrentAmount();
  const value = totalAmount.value.find(v => v.instance === committeeInstance);

  assert(value, `No matched invititation found in this purse`);
  const amount = AmountMath.make(totalAmount.brand, harden([value]));

  const voterInvitation = await E(invitationPurse).withdraw(amount);

  console.log('Offering invitation to get voterSeat');
  const voterSeat = E(zoe).offer(voterInvitation);
  const voterFacet = E(voterSeat).getOfferResult();

  console.log('Writing `icaVoterFacet` to scratch');
  await E(scratch).set('icaVoterFacet', voterFacet);

  console.log('Done');
}
