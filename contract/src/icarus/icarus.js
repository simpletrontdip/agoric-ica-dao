// icarus

import { assert, details as X } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makeLegacyMap } from '@agoric/store';
import { makeSubscriptionKit } from '@agoric/notifier';
import { parse } from '@agoric/swingset-vat/src/vats/network/multiaddr.js';

import { ICS27ICAProtocol } from './ics27.js';

const DEFAULT_ICA_PROTOCOL = ICS27ICAProtocol;

const makeIdGenerator = (prefix = 'id-') => {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `${prefix}${nextId}`;
  };
};

const makeIcarus = async ({
  networkVat,
  hostChainId,
  hostConnectionId,
  hostPortId = 'icahost',
  controllerConnectionId,
  icaProtocol = DEFAULT_ICA_PROTOCOL,
}) => {
  assert(hostChainId, X`Host chain id is required, got ${hostChainId}`);
  assert(
    hostConnectionId,
    X`Host connection id is required, got ${hostConnectionId}`,
  );
  assert(
    controllerConnectionId,
    X`Controller connection id is required, got ${controllerConnectionId}`,
  );

  const ownerToIcaKit = makeLegacyMap('ownerToIcaKit');
  const ownerToIcaState = makeLegacyMap('ownerToIcaState');
  const ownerToActiveConnectionP = makeLegacyMap('ownerToActiveConnectionP');

  const nextOwnerId = makeIdGenerator(`${controllerConnectionId}-owner-`);

  /**
   * Make an ICA port identify this user on host chain
   *
   * @param {string} ownerId
   * @returns
   */
  const makeIcaPort = async ownerId => {
    const portId = `icacontroller-${ownerId}`;
    return E(networkVat).bind(`/ibc-port/${portId}`);
  };

  /**
   * @param {string} ownerId
   * @returns {IcarusActions}
   */
  const makeIcarusActions = ownerId => {
    const sendTxMsgs = async msgs => {
      const conn = await getIcaActiveChannel(ownerId);
      const icaTxPackage = await E(icaProtocol).makeICAPacket(msgs);
      return E(conn)
        .send(icaTxPackage)
        .then(ack => E(icaProtocol).assertICAPacketAck(ack));
    };

    const isReady = () => {
      const state = ownerToIcaState.get(ownerId);
      return state.isReady;
    };

    const getAddress = async () => {
      await getIcaActiveChannel(ownerId);
      const state = ownerToIcaState.get(ownerId);
      return state.icaAddr;
    };

    return Far(
      'icarusActions',
      /** @type {IcarusActions} */
      {
        sendTxMsgs,
        isReady,
        getAddress,
      },
    );
  };

  const parseIcaAddr = remoteAddr => {
    const pairs = parse(remoteAddr);
    const version = pairs.find(([key]) => key === 'ordered')[1];
    const metaData = JSON.parse(version);

    return metaData.address;
  };

  const makeIcarusConnectionKit = ownerId => {
    const { subscription, publication } = makeSubscriptionKit();
    return {
      handler: Far('icarusConnectionHandler', {
        async onOpen(_c, localAddr, remoteAddr) {
          try {
            const icaAddr = parseIcaAddr(remoteAddr);
            const currentState = ownerToIcaState.get(ownerId);

            const state = harden({
              ...currentState,
              localAddr,
              remoteAddr,
              icaAddr,
              isReady: true,
            });

            // update existing state
            ownerToIcaState.set(ownerId, state);

            // notify changes
            publication.updateState(state);
          } catch (error) {
            publication.fail(error);
          }
        },
        async onClose(_c) {
          try {
            const currentState = ownerToIcaState.get(ownerId);

            const state = harden({
              ...currentState,
              isReady: false,
            });

            // unset active connection
            ownerToActiveConnectionP.delete(ownerId);

            // update new state
            ownerToIcaState.set(ownerId, state);

            // notify changes
            publication.updateState(state);
          } catch (error) {
            publication.fail(error);
          }
        },
      }),
      subscription,
      publication,
    };
  };

  const connectIcaHost = async (icaPort, handler, publication) => {
    const version = JSON.stringify({
      version: 'ics27-1',
      hostConnectionId,
      controllerConnectionId,
      address: '',
      encoding: 'proto3',
      txType: 'sdk_multi_msg',
    });
    const connStr = `/ibc-hop/${controllerConnectionId}/ibc-port/${hostPortId}/ordered/${version}`;
    return E(icaPort)
      .connect(connStr, handler)
      .catch(publication.fail);
  };

  const setupIcaChannelOnHost = async ownerId => {
    const { port, handler, publication } = ownerToIcaKit.get(ownerId);

    const connectionP = connectIcaHost(port, handler, publication);
    ownerToActiveConnectionP.init(ownerId, connectionP);

    return connectionP;
  };

  /**
   * Get ICA active channel, re-connect if needed
   *
   * @param {string} ownerId
   * @returns {Promise<Connection>}
   */
  const getIcaActiveChannel = async ownerId => {
    if (ownerToActiveConnectionP.has(ownerId)) {
      return ownerToActiveConnectionP.get(ownerId);
    }

    // active channel has been cleared (maybe by a timeout)
    // set it up again
    return setupIcaChannelOnHost(ownerId);
  };

  return Far(`icarus-to-${hostChainId}`, {
    /**
     * Register an ICA account, return a subscription for action kit
     *
     * @typedef IcarusState
     * @property {IcarusActions} actions
     * @property {boolean} isReady
     * @property {ownerId} string
     *
     * @returns {{
     *  icaActions: IcarusActions
     *  subscription: Subscription<IcarusState>
     * }}
     */
    async register() {
      const ownerId = nextOwnerId();
      assert(
        !ownerToIcaState.has(ownerId),
        `Owner adress ${ownerId} has been registered`,
      );

      const port = await makeIcaPort(ownerId);
      const { handler, subscription, publication } = makeIcarusConnectionKit(
        ownerId,
      );

      const icaKit = harden({
        handler,
        port,
        publication,
      });

      const actions = makeIcarusActions(ownerId);
      const icaState = harden({
        ownerId,
        actions,
        isReady: false,
      });

      // init the state
      ownerToIcaKit.init(ownerId, icaKit);
      ownerToIcaState.init(ownerId, icaState);

      // start connecting ica host
      setupIcaChannelOnHost(ownerId);

      return {
        ownerId,
        subscription,
        icaActions: actions,
      };
    },
  });
};

const start = async zcf => {
  const { networkVat } = zcf.getTerms();
  const connectionIdToBridge = makeLegacyMap('connectionIdToIcarusBridge');
  const { subscription, publication } = makeSubscriptionKit();

  const makeIcarusBridge = async ({
    hostChainId,
    hostConnectionId,
    hostPortId = 'icahost',
    controllerConnectionId,
  }) => {
    assert(
      !connectionIdToBridge.has(controllerConnectionId),
      X`Connection ${controllerConnectionId} has been registered`,
    );

    const bridge = await makeIcarus({
      networkVat,
      hostPortId,
      hostChainId,
      hostConnectionId,
      controllerConnectionId,
    });

    connectionIdToBridge.init(controllerConnectionId, bridge);
    publication.updateState(bridge);

    return bridge;
  };

  const getIcarusBridge = async connectionId => {
    assert(
      connectionIdToBridge.has(connectionId),
      `No bridge found for connection ${connectionId}`,
    );
    return connectionIdToBridge.get(connectionId);
  };

  const getBridgeNotifier = () => subscription;

  return {
    publicFacet: Far('icarus publicFacet', {
      getIcarusBridge,
      getBridgeNotifier,
    }),
    creatorFacet: Far('icarus creatorFacet', {
      makeIcarusBridge,
      getIcarusBridge,
      getBridgeNotifier,
    }),
  };
};

harden(start);
harden(makeIcarus);
export { start, makeIcarus };
