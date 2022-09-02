// icarus

import { assert, details as X } from '@agoric/assert';
import { E, Far } from '@endo/far';
import { makeSubscriptionKit } from '@agoric/notifier';
import { parse } from '@agoric/swingset-vat/src/vats/network/multiaddr.js';

import { ICS27ICAProtocol } from './ics27.js';

const DEFAULT_ICA_PROTOCOL = ICS27ICAProtocol;
const DEFAULT_ICA_PORT_PREFIX = 'icarus';

const CONNECTION_ERROR_REGEXS = [
  /packet timed out/i,
  /client is not active/i,
  /invalid channel state/i,
];

const makeIdGenerator = (prefix = 'id-') => {
  let nextId = 0;
  return () => {
    nextId += 1;
    return `${prefix}${nextId}`;
  };
};

const parseIcaAddr = remoteAddr => {
  const pairs = parse(remoteAddr);
  const version = pairs.find(([key]) => key === 'ordered')[1];
  const metaData = JSON.parse(version);

  return metaData.address;
};

const parsePortId = localAddr => {
  const pairs = parse(localAddr);
  return pairs.find(([key]) => key === 'ibc-port')[1];
};

const makeIcarus = async ({
  networkVat,
  icaProtocol = DEFAULT_ICA_PROTOCOL,
  icaPortPrefix = DEFAULT_ICA_PORT_PREFIX,
}) => {
  const nextIcaPortId = makeIdGenerator(`icacontroller-${icaPortPrefix}-`);

  const makeIcaPort = async portId => {
    return E(networkVat).bind(`/ibc-port/${portId}`);
  };

  const makeIcaConnectionKit = () => {
    const { subscription, publication } = makeSubscriptionKit();
    let state = {
      isReady: false,
      isConnecting: false,
      icaAddress: null,
    };

    const updateState = newAttrs => {
      // update current state with new attrs
      state = {
        ...state,
        ...newAttrs,
      };

      // publish to all subscribers
      publication.updateState(harden(state));
    };

    const handler = Far('icarusConnectionHandler', {
      onOpen(_c, localAddr, remoteAddr) {
        try {
          updateState({
            localAddr,
            remoteAddr,
            icaAddr: parseIcaAddr(remoteAddr),
            isReady: true,
          });
        } catch (error) {
          publication.fail(error);
        }
      },
      onClose(_c) {
        try {
          updateState({
            isReady: false,
          });
        } catch (error) {
          publication.fail(error);
        }
      },
    });

    return {
      getState() {
        return state;
      },
      updateState,
      handler,
      subscription,
      publication,
    };
  };

  const openIcaChannel = async ({
    icaPort,
    handler,
    publication,
    hostConnectionId,
    controllerConnectionId,
    hostPortId,
    address = '',
  }) => {
    const version = JSON.stringify({
      version: 'ics27-1',
      hostConnectionId,
      controllerConnectionId,
      address,
      encoding: 'proto3',
      txType: 'sdk_multi_msg',
    });
    const connStr = `/ibc-hop/${controllerConnectionId}/ibc-port/${hostPortId}/ordered/${version}`;
    return E(icaPort)
      .connect(connStr, handler)
      .catch(publication.fail);
  };

  const makeIcaActions = async ({
    icaPort,
    // portId,
    controllerConnectionId,
    hostConnectionId,
    hostPortId,
  }) => {
    const {
      getState,
      updateState,
      subscription,
      publication,
      handler,
    } = makeIcaConnectionKit();

    const doConnect = async overrides => {
      updateState({
        isConnecting: true,
      });

      return openIcaChannel({
        controllerConnectionId,
        hostConnectionId,
        // only allow overriding connection ids, address in case of reconnecting
        ...overrides,
        // these params can not be changed
        hostPortId,
        icaPort,
        handler,
        publication,
      }).finally(() => {
        updateState({
          isConnecting: false,
        });
      });
    };

    const handleConnectionError = error => {
      for (errorRegex of CONNECTION_ERROR_REGEXS) {
        if (errorRegex.test(error)) {
          // mark as not ready
          updateState({
            isReady: false,
          });
          break;
        }
      }

      // rethrow error
      throw error;
    };

    // wait for first attempt
    let conn = await doConnect();

    return {
      subscription,
      icaActions: Far('icarusConnectionActions', {
        state() {
          return getState();
        },
        isReady() {
          return getState().isReady;
        },
        getAddress() {
          return getState().icaAddr;
        },
        async sendTxMsgs(msgs) {
          const icaTxPackage = await E(icaProtocol).makeICAPacket(msgs);
          return E(conn)
            .send(icaTxPackage)
            .then(ack => E(icaProtocol).assertICAPacketAck(ack))
            .catch(handleConnectionError);
        },
        async reconnect(overrides) {
          if (getState().isConnecting) {
            throw Error('Another connecting attempt is in progress');
          }
          // update the connection
          conn = await doConnect({
            ...overrides,
            // reconnect with negotiated address
            address: getState().icaAddr,
          });
        },
        async close() {
          return E(conn).close();
        },
      }),
    };
  };

  const buildControllerActions = async icaPort => {
    const localAddr = await E(icaPort).getLocalAddress();
    const portId = parsePortId(localAddr);

    return Far('icarusControllerActions', {
      async getPort() {
        return icaPort;
      },
      async getPortId() {
        return portId;
      },
      async makeRemoteAccount({
        hostConnectionId,
        hostPortId = 'icahost',
        controllerConnectionId,
      }) {
        assert(hostPortId, X`Host port id is required, got ${hostPortId}`);
        assert(
          hostConnectionId,
          X`Host connection id is required, got ${hostConnectionId}`,
        );
        assert(
          controllerConnectionId,
          X`Controller connection id is required, got ${controllerConnectionId}`,
        );

        return makeIcaActions({
          icaPort,
          portId,
          controllerConnectionId,
          hostConnectionId,
          hostPortId,
        });
      },
    });
  };

  return {
    /**
     * Register a port on controller chain, return an IcarusControllerActions
     * (Which can be used to register multiple account on multiple host chains)
     *
     * */
    async newController() {
      // XXX should we try to bindport until success
      const portId = nextIcaPortId();
      const icaPort = await makeIcaPort(portId);

      return buildControllerActions(icaPort, portId);
    },

    /**
     * Make a IcarusControllerActions from given port
     * (useful when we want to reclaim controller or upgrading Icarus)
     *
     * @param {Port} icaPort
     */
    async makeController(icaPort) {
      return buildControllerActions(icaPort);
    },
  };
};

const start = async zcf => {
  const { networkVat } = zcf.getTerms();
  const icarus = await makeIcarus({ networkVat });

  return {
    publicFacet: Far('icarus', icarus),
  };
};

harden(start);
harden(makeIcarus);
export { start, makeIcarus };
