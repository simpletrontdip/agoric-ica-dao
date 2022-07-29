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

  const nextOwnerId = makeIdGenerator(`${controllerConnectionId}-owner-`);

  const makeIcaPort = async ownerId => {
    const portId = `icacontroller-${ownerId}`;
    return E(networkVat).bind(`/ibc-port/${portId}`);
  };

  /**
   * @param {*} conn
   * @param {*} ownerId
   * @returns {IcarusConnectionActions}
   */
  const makeIcarusConnectionActions = (conn, ownerId) => {
    let closed = false;

    const close = () => {
      if (closed) {
        return null;
      }

      closed = true;
      return E(conn).close();
    };

    const reconnect = async () => {
      await close();

      // XXX trigger reconnect, do no awaiting
      const { port, handler, publication } = ownerToIcaKit.get(ownerId);
      // eslint-disable-next-line no-use-before-define
      await connectIcaHost(port, handler, publication);
    };

    const sendTxMsgs = async msgs => {
      const icaTxPackage = await E(icaProtocol).makeICAPacket(msgs);
      return E(conn)
        .send(icaTxPackage)
        .then(ack => E(icaProtocol).assertICAPacketAck(ack));
    };

    const getIcaAddress = async () => {
      const state = ownerToIcaState.get(ownerId);
      return state.icaAddr;
    };

    return Far(
      'icarusConnectionActions',
      /** @type {IcarusConnectionActions} */
      {
        close,
        reconnect,
        sendTxMsgs,
        getIcaAddress,
      },
    );
  };

  const getIcaAddrFromRemoteAddr = remoteAddr => {
    const pairs = parse(remoteAddr);
    const version = pairs.find(([key]) => key === 'ordered')[1];
    const metaData = JSON.parse(version);

    return metaData.address;
  };

  const makeIcarusConnectionKit = ownerId => {
    const { subscription, publication } = makeSubscriptionKit();
    return {
      handler: Far('icarusConnectionHandler', {
        async onOpen(c, localAddr, remoteAddr) {
          try {
            const icaAddr = getIcaAddrFromRemoteAddr(remoteAddr);
            const actions = makeIcarusConnectionActions(c, ownerId);

            const state = harden({
              localAddr,
              remoteAddr,
              actions,
              icaAddr,
              ownerId,
            });

            ownerToIcaState.init(ownerId, state);
            publication.updateState(state);
          } catch (error) {
            publication.fail(error);
          }
        },
        async onClose(_c) {
          try {
            const {
              localAddr,
              remoteAddr,
              icaAddr,
              ownerId,
            } = ownerToIcaState.get(ownerId);

            const state = harden({
              localAddr,
              remoteAddr,
              // actions,
              icaAddr,
              ownerId,
            });

            // update new state w/o actions
            ownerToIcaState.set(ownerId, state);
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

  return Far(`icarus-to-${hostChainId}`, {
    /**
     * Register an ICA account, return a subscription for action kit
     *
     * @returns {Subscription<IcarusConnectionActions>}
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

      ownerToIcaKit.init(ownerId, icaKit);

      // start connecting ica host
      connectIcaHost(port, handler, publication);

      return subscription;
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
      X`No bridge found for connection ${connectionId}`,
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
