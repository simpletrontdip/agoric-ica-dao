/* eslint-disable */
import Long from 'long';
import _m0 from 'protobufjs/minimal.js';
import { atob, btoa } from '@endo/base64';

function createBaseAny() {
  return { typeUrl: '', value: new Uint8Array() };
}

export const Any = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.typeUrl !== '') {
      writer.uint32(10).string(message.typeUrl);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAny();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.typeUrl = reader.string();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object) {
    return {
      typeUrl: isSet(object.typeUrl) ? String(object.typeUrl) : '',
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
    };
  },
  toJSON(message) {
    const obj = {};
    message.typeUrl !== undefined && (obj.typeUrl = message.typeUrl);
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object) {
    var _a, _b;
    const message = createBaseAny();
    message.typeUrl =
      ((_a = object.typeUrl), _a !== null && _a !== void 0 ? _a : '');
    message.value =
      ((_b = object.value),
      _b !== null && _b !== void 0 ? _b : new Uint8Array());
    return message;
  },
};

/**
 * Type defines a classification of message issued from a controller chain to its associated interchain accounts
 * host
 */
export var Type;
(function(Type) {
  /** TYPE_UNSPECIFIED - Default zero value enumeration */
  Type[(Type['TYPE_UNSPECIFIED'] = 0)] = 'TYPE_UNSPECIFIED';
  /** TYPE_EXECUTE_TX - Execute a transaction on an interchain accounts host chain */
  Type[(Type['TYPE_EXECUTE_TX'] = 1)] = 'TYPE_EXECUTE_TX';
  Type[(Type['UNRECOGNIZED'] = -1)] = 'UNRECOGNIZED';
})(Type || (Type = {}));

export function typeFromJSON(object) {
  switch (object) {
    case 0:
    case 'TYPE_UNSPECIFIED':
      return Type.TYPE_UNSPECIFIED;
    case 1:
    case 'TYPE_EXECUTE_TX':
      return Type.TYPE_EXECUTE_TX;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return Type.UNRECOGNIZED;
  }
}

export function typeToJSON(object) {
  switch (object) {
    case Type.TYPE_UNSPECIFIED:
      return 'TYPE_UNSPECIFIED';
    case Type.TYPE_EXECUTE_TX:
      return 'TYPE_EXECUTE_TX';
    default:
      return 'UNKNOWN';
  }
}

function createBaseInterchainAccountPacketData() {
  return { type: 0, data: new Uint8Array(), memo: '' };
}

export const InterchainAccountPacketData = {
  encode(message, writer = _m0.Writer.create()) {
    if (message.type !== 0) {
      writer.uint32(8).int32(message.type);
    }
    if (message.data.length !== 0) {
      writer.uint32(18).bytes(message.data);
    }
    if (message.memo !== '') {
      writer.uint32(26).string(message.memo);
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInterchainAccountPacketData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.type = reader.int32();
          break;
        case 2:
          message.data = reader.bytes();
          break;
        case 3:
          message.memo = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object) {
    return {
      type: isSet(object.type) ? typeFromJSON(object.type) : 0,
      data: isSet(object.data)
        ? bytesFromBase64(object.data)
        : new Uint8Array(),
      memo: isSet(object.memo) ? String(object.memo) : '',
    };
  },
  toJSON(message) {
    const obj = {};
    message.type !== undefined && (obj.type = typeToJSON(message.type));
    message.data !== undefined &&
      (obj.data = base64FromBytes(
        message.data !== undefined ? message.data : new Uint8Array(),
      ));
    message.memo !== undefined && (obj.memo = message.memo);
    return obj;
  },
  fromPartial(object) {
    var _a, _b, _c;
    const message = createBaseInterchainAccountPacketData();
    message.type = ((_a = object.type), _a !== null && _a !== void 0 ? _a : 0);
    message.data =
      ((_b = object.data),
      _b !== null && _b !== void 0 ? _b : new Uint8Array());
    message.memo = ((_c = object.memo), _c !== null && _c !== void 0 ? _c : '');
    return message;
  },
};

function createBaseCosmosTx() {
  return { messages: [] };
}

export const CosmosTx = {
  encode(message, writer = _m0.Writer.create()) {
    for (const v of message.messages) {
      Any.encode(v, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCosmosTx();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.messages.push(Any.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object) {
    var _a;
    return {
      messages: Array.isArray(
        (_a = object) === null || _a === void 0 ? void 0 : _a.messages,
      )
        ? object.messages.map(e => Any.fromJSON(e))
        : [],
    };
  },
  toJSON(message) {
    const obj = {};
    if (message.messages) {
      obj.messages = message.messages.map(e => (e ? Any.toJSON(e) : undefined));
    } else {
      obj.messages = [];
    }
    return obj;
  },
  fromPartial(object) {
    var _a;
    const message = createBaseCosmosTx();
    message.messages =
      ((_a = object.messages) === null || _a === void 0
        ? void 0
        : _a.map(e => Any.fromPartial(e))) || [];
    return message;
  },
};

function bytesFromBase64(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr;
}

function base64FromBytes(arr) {
  const bin = [];
  for (const byte of arr) {
    bin.push(String.fromCharCode(byte));
  }
  return btoa(bin.join(''));
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long;
  _m0.configure();
}

function isSet(value) {
  return value !== null && value !== undefined;
}
