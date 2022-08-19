import { E } from '@endo/eventual-send';
import { handleParamGovernance, ParamTypes } from '@agoric/governance';
import { observeIteration } from '@agoric/notifier';

import {
  buildClaimRewardMsg,
  buildDelegateMsg,
  buildRedelegateMsg,
  buildUndelegateMsg,
  buildVoteMsg,
} from './encoder';

const ICARUS_INSTANCE = 'IcarusInstance';
const ICARUS_CONNECTION = 'IcarusConnection';

const start = async (zcf, privateArgs) => {
  const {
    augmentPublicFacet,
    makeGovernorFacet,
    params,
  } = await handleParamGovernance(
    zcf,
    privateArgs.initialPoserInvitation,
    {
      [ICARUS_INSTANCE]: ParamTypes.INSTANCE,
      [ICARUS_CONNECTION]: ParamTypes.STRING,
    },
    privateArgs.storageNode,
    privateArgs.marshaller,
  );

  const zoe = zcf.getZoeService();
  const icarusPublicFacet = E(zoe).getPublicFacet(params.getIcarusInstance());

  const icarusBridge = await E(icarusPublicFacet).getIcarusBridge(
    params.getIcarusConnection(),
  );

  const { icaActions, subscription } = await E(icarusBridge).register();

  // observe the change
  observeIteration(subscription, {
    updateState(connectionState) {
      const { isReady, icaAddr, localAddr, remoteAddr } = connectionState;
      console.log('ICA state changed', {
        isReady,
        icaAddr,
        localAddr,
        remoteAddr,
      });
    },
    fail(error) {
      console.error('Error', error);
    },
  });

  const governedApis = {
    async sendDelegate(params) {
      const icaAddress = await E(icaActions).getAddress();
      const msg = buildDelegateMsg({
        delegatorAddress: icaAddress,
        ...params,
      });
      return E(icaActions).sendTxMsgs([msg]);
    },
    async sendRedelegate(params) {
      const icaAddress = await E(icaActions).getAddress();
      const msg = buildRedelegateMsg({
        delegatorAddress: icaAddress,
        ...params,
      });
      return E(icaActions).sendTxMsgs([msg]);
    },
    async sendUndelegate(params) {
      const icaAddress = await E(icaActions).getAddress();
      const msg = buildUndelegateMsg({
        delegatorAddress: icaAddress,
        ...params,
      });
      return E(icaActions).sendTxMsgs([msg]);
    },
    async sendVote(params) {
      const icaAddress = await E(icaActions).getAddress();
      const msg = buildVoteMsg({
        voter: icaAddress,
        ...params,
      });
      return E(icaActions).sendTxMsgs([msg]);
    },
    async sendRawTxMsg(msgs) {
      return E(icaActions).sendTxMsgs(msgs);
    },
  };

  const publicApis = {
    isIcaReady() {
      return E(icaActions).isReady();
    },
    getAddress() {
      return E(icaActions).getAddress();
    },
  };

  const creatorApis = {
    async sendClaimReward(params) {
      const icaAddress = await E(icaActions).getAddress();
      const msg = buildClaimRewardMsg({
        delegatorAddress: icaAddress,
        ...params,
      });
      return E(icaActions).sendTxMsgs([msg]);
    },
  };

  const creatorFacet = makeGovernorFacet(
    Far('ICA creator', creatorApis),
    governedApis,
  );
  const publicFacet = augmentPublicFacet(Far('ICA public', publicApis));

  return { creatorFacet, publicFacet };
};

harden(start);
export { start };
