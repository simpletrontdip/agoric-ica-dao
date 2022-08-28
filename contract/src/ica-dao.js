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
const ICARUS_CONNECTION_PARAMS = 'IcarusConnectionParams';

const start = async (zcf, privateArgs) => {
  const {
    augmentPublicFacet,
    makeGovernorFacet,
    params,
  } = await handleParamGovernance(zcf, privateArgs.initialPoserInvitation, {
    [ICARUS_INSTANCE]: ParamTypes.INSTANCE,
    [ICARUS_CONNECTION_PARAMS]: ParamTypes.PASSABLE_RECORD,
  });

  const supportedTxMsgs = {
    delegate: buildDelegateMsg,
    undelegate: buildUndelegateMsg,
    redelegate: buildRedelegateMsg,
    vote: buildVoteMsg,
    claimReward: buildClaimRewardMsg,
  };

  let isRegistered = false;
  let icaActions = null;
  let icaController = null;
  const lastIcarusInstance = null;

  const setIcaActions = actions => {
    icaActions = actions;
  };

  const getUpdatedIcaController = async () => {
    const zoe = zcf.getZoeService();
    const icarusInstance = params.getIcarusInstance();

    if (!icaController) {
      // no controller registered, create a new one
      icaController = await E(
        E(zoe).getPublicFacet(icarusInstance),
      ).newController();

      return icaController;
    }

    // controller exists, let's check more
    if (lastIcarusInstance === params.getIcarusInstance()) {
      // instance did not change, just return it
      return icaController;
    }

    // instance changed, update from original one
    const icaPort = await E(icaController).getPort();
    icaController = await E(
      E(zoe).getPublicFacet(icarusInstance),
    ).makeController(icaPort);

    return icaController;
  };

  const registerAccount = async () => {
    if (isRegistered) {
      throw Error('Already registered');
    }

    isRegistered = true;
    const controller = await getUpdatedIcaController();
    const {
      hostPortId,
      hostConnectionId,
      controllerConnectionId,
    } = params.getIcarusConnectionParams();

    const { icaActions: actions, subscription } = await E(
      controller,
    ).makeRemoteAccount({
      hostPortId,
      hostConnectionId,
      controllerConnectionId,
    });

    // update the ref
    setIcaActions(actions);

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
  };

  const reconnectAccount = async () => {
    if (!isRegistered) {
      throw Error('Not registered');
    }

    const {
      hostConnectionId,
      controllerConnectionId,
    } = params.getIcarusConnectionParams();

    return E(icaActions).reconnect({
      hostConnectionId,
      controllerConnectionId,
    });
  };

  const sendIcaTxMsg = (type, args) => {
    const buildFn = supportedTxMsgs[type];
    assert(buildFn, `Msg type ${type} is not supported`);

    const msg = buildFn(args);
    return E(icaActions).sendTxMsgs([msg]);
  };

  const governedApis = {
    async delegate(args) {
      return sendIcaTxMsg('delegate', args);
    },
    async redelegate(args) {
      return sendIcaTxMsg('redelegate', args);
    },
    async undelegate(args) {
      return sendIcaTxMsg('undelegate', args);
    },
    async vote(args) {
      return sendIcaTxMsg('vote', args);
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
    async claimReward(args) {
      return sendIcaTxMsg('claimReward', args);
    },
    registerAccount,
    reconnectAccount,
  };

  const creatorFacet = makeGovernorFacet(creatorApis, governedApis);
  const publicFacet = augmentPublicFacet(publicApis);

  return { creatorFacet, publicFacet };
};

harden(start);
export { start };