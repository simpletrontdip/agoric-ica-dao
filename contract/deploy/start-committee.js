// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { committee } from './constants.js';

const options = {
  name: 'ICA committee',
  size: 3,
};

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP) {
  const { zoe, scratch, board, personalStorage } = await homeP;

  const storageNode = await E(personalStorage).makeChildNode(
    options.name.replace(/[ ,]/g, '_'),
  );
  const marshaller = await E(board).getReadonlyMarshaller();

  const installation = await E(scratch).get(`installation.${committee}`);
  const terms = harden({
    committeeName: options.name,
    committeeSize: options.size,
  });
  const issuerKeywordRecord = harden({});
  const privateArgs = harden({
    storageNode,
    marshaller,
  });

  // start instance
  console.log('Starting committee');
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
  );

  console.log('Writing to home scratch');
  await Promise.all([
    E(scratch).set(`creatorFacet.${committee}`, creatorFacet),
    E(scratch).set(`instance.${committee}`, instance),
  ]);

  console.log('Done');
}
