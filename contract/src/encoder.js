import {
  MsgDelegate,
  MsgBeginRedelegate,
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx.js';
import { MsgVote } from 'cosmjs-types/cosmos/gov/v1beta1/tx.js';
import { Any } from 'cosmjs-types/google/protobuf/any.js';

const makeBuildCosmosTxMsg = (MsgBuilder, typeUrl) => params => {
  const msg = MsgBuilder.fromPartial(params);
  const msgBytes = MsgBuilder.encode(msg).finish();

  return Any.toJSON({
    typeUrl,
    value: msgBytes,
  });
};

const buildDelegateMsg = makeBuildCosmosTxMsg(
  MsgDelegate,
  '/cosmos.staking.v1beta1.MsgDelegate',
);

const buildRedelegateMsg = makeBuildCosmosTxMsg(
  MsgBeginRedelegate,
  '/cosmos.staking.v1beta1.MsgBeginRedelegate',
);

const buildUndelegateMsg = makeBuildCosmosTxMsg(
  MsgUndelegate,
  '/cosmos.staking.v1beta1.MsgUndelegate',
);

const buildClaimRewardMsg = makeBuildCosmosTxMsg(
  MsgWithdrawDelegatorReward,
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
);

const buildVoteMsg = makeBuildCosmosTxMsg(
  MsgVote,
  '/cosmos.gov.v1beta1.MsgVote',
);

export {
  buildDelegateMsg,
  buildRedelegateMsg,
  buildUndelegateMsg,
  buildClaimRewardMsg,
  buildVoteMsg,
};
