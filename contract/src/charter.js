export const start = async (zcf, privateArgs) => {
  const { voteCounter: counter } = zcf.getTerms();
  const { ica } = privateArgs;

  /**
   * @param {*} target
   * @param {Record<string, unknown>} params
   * @param {bigint} deadline
   * @param {{paramPath: { key: unknown }}} [path]
   */
  const voteOnParamChanges = (
    target,
    params,
    deadline,
    path = { paramPath: { key: 'governedParams' } },
  ) => {
    return E(target).voteOnParamChanges(counter, deadline, {
      ...path,
      changes: params,
    });
  };

  /**
   * @param {*} target
   * @param {string} method
   * @param {Record<string, unknown>} params
   * @param {bigint} deadline
   */
  const voteOnApiInvocation = (target, method, params, deadline) => {
    return E(target).voteOnApiInvocation(method, params, counter, deadline);
  };

  const makeNullInvitation = () => {
    return zcf.makeInvitation(() => {}, 'icaCharter noop');
  };

  const publicFacet = Far('votingAPI', {
    /**
     * @param {Record<string, unknown>} params
     * @param {bigint} deadline
     */
    voteOnIcaParamChanges: (params, deadline) =>
      voteOnParamChanges(ica, params, deadline),
    /**
     * @param {Amount} amount
     * @param {string} validatorAddress
     * @param {bigint} deadline
     */
    voteOnIcaDelegate: (amount, validatorAddress, deadline) =>
      voteOnApiInvocation(
        ica,
        'sendDelegate',
        [amount, validatorAddress],
        deadline,
      ),
    /**
     * @param {Amount} amount
     * @param {string} validatorAddress
     * @param {bigint} deadline
     */
    voteOnIcaRedelegate: (amount, validatorAddress, deadline) =>
      voteOnApiInvocation(
        ica,
        'sendRedelegate',
        [amount, validatorAddress],
        deadline,
      ),
    /**
     * @param {Amount} amount
     * @param {string} validatorAddress
     * @param {bigint} deadline
     */
    voteOnIcaUndelegate: (amount, validatorAddress, deadline) =>
      voteOnApiInvocation(
        ica,
        'sendUndelegate',
        [amount, validatorAddress],
        deadline,
      ),
    /**
     * @param {string} proposalId
     * @param {any} option
     * @param {bigint} deadline
     */
    voteOnIcaVote: (proposalId, option, deadline) =>
      voteOnApiInvocation(ica, 'sendVote', [proposalId, option], deadline),
    makeNullInvitation,
  });

  return harden({ publicFacet });
};
