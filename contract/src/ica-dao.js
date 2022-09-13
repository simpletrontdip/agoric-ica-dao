import { E } from '@endo/eventual-send';
import { handleParamGovernance, ParamTypes } from '@agoric/governance';

import {
  buildClaimRewardMsg,
  buildDelegateMsg,
  buildRedelegateMsg,
  buildUndelegateMsg,
  buildVoteMsg,
} from './encoder';

const ICARUS_INSTANCE = 'IcarusInstance';

const start = async (zcf, privateArgs) => {
  const {
    augmentPublicFacet,
    makeGovernorFacet,
    params,
  } = await handleParamGovernance(zcf, privateArgs.initialPoserInvitation, {
    [ICARUS_INSTANCE]: ParamTypes.INSTANCE,
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

  const getUpdatedController = async () => {
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

  const registerAccount = async ({
    hostPortId,
    hostConnectionId,
    controllerConnectionId,
  }) => {
    if (isRegistered) {
      throw Error('Already registered');
    }

    isRegistered = true;
    const controller = await getUpdatedController();

    const { icaActions: actions } = await E(controller).makeRemoteAccount({
      hostPortId,
      hostConnectionId,
      controllerConnectionId,
    });

    // update the ref
    setIcaActions(actions);
  };

  const reconnectAccount = async () => {
    if (!isRegistered) {
      throw Error('Not registered');
    }

    return E(icaActions).reconnect();
  };

  const sendIcaTxMsg = (type, args) => {
    assert(isRegistered, 'Not registered, please `registerAccount` first');

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
    registerAccount,
  };

  const publicApis = {
    isReady() {
      return E(icaActions).isReady();
    },
    getAddress() {
      return E(icaActions).getAddress();
    },
    async getPortId() {
      const controller = await getUpdatedController();
      return E(controller).getPortId();
    },
  };

  const creatorApis = {
    async claimReward(args) {
      return sendIcaTxMsg('claimReward', args);
    },
    reconnectAccount,
  };

  const creatorFacet = makeGovernorFacet(creatorApis, governedApis);
  const publicFacet = augmentPublicFacet(publicApis);

  return { creatorFacet, publicFacet };
};

harden(start);
export { start };
