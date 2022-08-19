// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { ParamTypes } from '@agoric/governance';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, chainTimerService, board } = await homeP;

  const governorBundle = await bundleSource(
    pathResolve(`@agoric/governance/src/contractGovernor.js`),
  );
  const governorInstall = await E(zoe).install(governorBundle);

  const icaContractBundle = await bundleSource(
    pathResolve(`./src/contract.js`),
  );
  const icaContractInstall = await E(zoe).install(icaContractBundle);

  const [
    committeeCreator,
    electorateInstance,
    icarusInstance,
    timer,
  ] = await Promise.all([
    E(scratch).get('committeeCreatorFacet'),
    E(scratch).get('committeeInstance'),
    E(scratch).get('icarusInstance'),
    chainTimerService,
  ]);

  const poserInvitationP = E(committeeCreator).getPoserInvitation();
  const [poserInvitation, poserInvitationAmount] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  const icaTerms = harden({
    governedParams: {
      Electorate: {
        type: ParamTypes.INVITATION,
        value: poserInvitationAmount,
      },
      IcarusInstance: {
        type: ParamTypes.INSTANCE,
        value: icarusInstance,
      },
      IcarusConnection: {
        type: ParamTypes.STRING,
        value: 'connection-0',
      },
    },
  });

  const icaGovernorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: icaContractInstall,
    governed: {
      terms: icaTerms,
      issuerKeywordRecord: {},
    },
  };

  // start instance
  console.log('Starting governor');
  const g = await E(zoe).startInstance(governorInstall, {}, icaGovernorTerms, {
    electorateCreatorFacet: committeeCreator,
    governed: {
      initialPoserInvitation: poserInvitation,
    },
  });

  const [creatorFacet, publicFacet, instance] = await Promise.all([
    E(g.creatorFacet).getCreatorFacet(),
    E(g.creatorFacet).getPublicFacet(),
    E(g.publicFacet).getGovernedContract(),
  ]);

  console.log('Writing to home scratch');
  await Promise.all([
    E(scratch).set('icaGovernorCreatorFacet', creatorFacet),
    E(scratch).set('icaGovernorPublicFacet', publicFacet),
    E(scratch).set('icaGovernorInstance', instance),
  ]);

  console.log('Done');
}
