# Slims a baked litro testnode image for CI. The snapshot runtime only uses anvil, nitro, node,
# cast, config-server.py, the machines dirs and /opt/arbitrum-testnode; the paths removed below
# are build-time only. Flattening drops their bytes from the pull (1595 -> ~570 MiB compressed).
ARG BASE
FROM ${BASE} AS src
USER root
RUN rm -rf /workspace /contracts \
      /usr/local/bin/validator /usr/local/bin/jit /usr/local/bin/prover /usr/local/bin/nitro-val \
      /usr/local/bin/daprovider /usr/local/bin/filtering-report /usr/local/bin/transaction-filterer \
      /usr/local/bin/el-proxy /usr/local/bin/genesis-generator /usr/local/bin/anytrustserver

FROM scratch
COPY --from=src / /
ARG VARIANT
ENV TESTNODE_VARIANT=${VARIANT} PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
USER user
WORKDIR /home/user/
EXPOSE 6070-6075 6080 8080 8545 8547 8548 8549 8550 9642 9646
HEALTHCHECK --interval=3s --timeout=3s --start-period=30s --retries=10 CMD /usr/local/bin/healthcheck.sh
ENTRYPOINT ["/usr/local/bin/arbitrum-testnode"]
