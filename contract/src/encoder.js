import {
  MsgDelegate,
  MsgBeginRedelegate,
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import { MsgWithdrawDelegatorReward } from 'cosmjs-types/cosmos/distribution/v1beta1/tx.js';
import { MsgVote } from 'cosmjs-types/cosmos/gov/v1beta1/tx.js';
import { Any } from 'cosmjs-types/google/protobuf/any.js';

import { assert, details as X } from '@agoric/assert';

const buildDelegateMsg = ({
  denom,
  amount,
  delegatorAddress,
  validatorAddress,
}) => {
  assert(denom, X`denom is required, got ${denom}`);
  assert(amount, X`amount is required, got ${amount}`);
  assert(
    delegatorAddress,
    X`delegatorAddress is required, got ${delegatorAddress}`,
  );
  assert(
    validatorAddress,
    X`validatorAddress is required, got ${validatorAddress}`,
  );

  const msg = MsgDelegate.fromPartial({
    amount: { denom, amount },
    delegatorAddress,
    validatorAddress,
  });

  const msgBytes = MsgDelegate.encode(msg).finish();

  return Any.toJSON({
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
    value: msgBytes,
  });
};

const buildRedelegateMsg = ({
  denom,
  amount,
  delegatorAddress,
  validatorSrcAddress,
  validatorDstAddress,
}) => {
  assert(denom, X`denom is required, got ${denom}`);
  assert(amount, X`amount is required, got ${amount}`);
  assert(
    delegatorAddress,
    X`delegatorAddress is required, got ${delegatorAddress}`,
  );
  assert(
    validatorAddress,
    X`validatorAddress is required, got ${validatorAddress}`,
  );

  const msg = MsgBeginRedelegate.fromPartial({
    amount: { denom, amount },
    delegatorAddress,
    validatorDstAddress,
    validatorSrcAddress,
  });

  const msgBytes = MsgBeginRedelegate.encode(msg).finish();

  return Any.toJSON({
    typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
    value: msgBytes,
  });
};

const buildUndelegateMsg = ({
  denom,
  amount,
  delegatorAddress,
  validatorAddress,
}) => {
  assert(denom, X`denom is required, got ${denom}`);
  assert(amount, X`amount is required, got ${amount}`);
  assert(
    delegatorAddress,
    X`delegatorAddress is required, got ${delegatorAddress}`,
  );
  assert(
    validatorAddress,
    X`validatorAddress is required, got ${validatorAddress}`,
  );

  const msg = MsgUndelegate.fromPartial({
    amount: { denom, amount },
    delegatorAddress,
    validatorAddress,
  });

  const msgBytes = MsgUndelegate.encode(msg).finish();

  return Any.toJSON({
    typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
    value: msgBytes,
  });
};

const buildClaimRewardMsg = ({ delegatorAddress, validatorAddress }) => {
  assert(
    delegatorAddress,
    X`delegatorAddress is required, got ${delegatorAddress}`,
  );
  assert(
    validatorAddress,
    X`validatorAddress is required, got ${validatorAddress}`,
  );

  const msg = MsgWithdrawDelegatorReward.fromPartial({
    delegatorAddress,
    validatorAddress,
  });

  const msgBytes = MsgWithdrawDelegatorReward.encode(msg).finish();

  return Any.toJSON({
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: msgBytes,
  });
};

const buildVoteMsg = ({ proposalId, voter, option }) => {
  assert(voter, X`voter is required, got ${voter}`);

  const msg = MsgVote.fromPartial({
    proposalId,
    voter,
    option,
  });

  const msgBytes = MsgVote.encode(msg).finish();

  return Any.toJSON({
    typeUrl: '/cosmos.gov.v1beta1.MsgVote',
    value: msgBytes,
  });
};

export {
  buildDelegateMsg,
  buildRedelegateMsg,
  buildUndelegateMsg,
  buildClaimRewardMsg,
  buildVoteMsg,
};
