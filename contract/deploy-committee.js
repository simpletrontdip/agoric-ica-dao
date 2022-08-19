// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';

const options = {
  name: 'ICA sample committee',
  size: 3,
  members: [],
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch } = await homeP;

  const committeeBundle = await bundleSource(
    pathResolve(`@agoric/governance/src/committee.js`),
  );
  const committeeInstall = await E(zoe).install(committeeBundle);

  // start instance
  console.log('Starting committee');
  const { creatorFacet, instance } = await E(zoe).startInstance(
    committeeInstall,
    {},
    { committeeName: options.name, committeeSize: options.size },
  );

  console.log('Writing to home scratch');
  await Promise.all([
    E(scratch).set('committeeCreatorFacet', creatorFacet),
    E(scratch).set('committeeInstance', instance),
  ]);

  console.log('Done');
}
