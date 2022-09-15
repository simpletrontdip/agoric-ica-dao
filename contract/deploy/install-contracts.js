// @ts-check
import { E } from '@endo/eventual-send';

import '@agoric/zoe/exported.js';
import { icarus, committee, governor, voteCounter } from './constants.js';

/**
 * @typedef {Object} DeployPowers The special powers that agoric deploy gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

export default async function deploy(homeP, { bundleSource, pathResolve }) {
  const { zoe, scratch } = await homeP;

  const contracts = {
    [icarus]: '../src/icarus/icarus.js',
    [committee]: '@agoric/governance/src/committee.js',
    [governor]: '@agoric/governance/src/contractGovernor.js',
    [voteCounter]: '@agoric/governance/src/binaryVoteCounter.js',
  };

  console.log('Installing contracts');

  const promises = Object.entries(contracts).map(async ([key, location]) => {
    console.log('Installing', key, 'location', location);

    const bundle = await bundleSource(pathResolve(location));
    const installation = await E(zoe).install(bundle);

    console.log('Writing to scratch', key);
    await E(scratch).set(`installation.${key}`, installation);
  });

  await Promise.all(promises);
  console.log('Done');
}
