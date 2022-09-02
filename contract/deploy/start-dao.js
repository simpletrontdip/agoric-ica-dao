// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { ParamTypes } from '@agoric/governance';
import { committee, governedIca, governor, icarus } from './constants.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch, chainTimerService } = await homeP;

  const icaContractBundle = await bundleSource(
    pathResolve(`../src/ica-dao.js`),
  );
  const icaContractInstall = await E(zoe).install(icaContractBundle);

  const [
    governorInstall,
    committeeCreator,
    electorateInstance,
    icarusInstance,
    timer,
  ] = await Promise.all([
    E(scratch).get(`installation.${governor}`),
    E(scratch).get(`creatorFacet.${committee}`),
    E(scratch).get(`instance.${committee}`),
    E(scratch).get(`instance.${icarus}`),
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
      IcarusConnectionParams: {
        type: ParamTypes.PASSABLE_RECORD,
        value: {
          hostPortId: 'icahost',
          controllerConnectionId: 'connection-1',
          hostConnectionId: 'connection-821',
        },
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
    E(scratch).set(`creatorFacet.${governor}`, g.creatorFacet),
    E(scratch).set(`creatorFacet.${governedIca}`, creatorFacet),
    E(scratch).set(`publicFacet.${governedIca}`, publicFacet),
    E(scratch).set(`instance.${governedIca}`, instance),
  ]);

  console.log('Done');
}
