AKASH_DIR=../akash
PROTO_PATH="$AKASH_DIR/proto/"
IBC_DIR=../ibc-go
SRC_PATHS=$(find "${IBC_DIR}/proto/ibc/applications/interchain_accounts/v1" -name "packet.proto")
OUTPUT_DIR="./codec/src"
LOG_FILE="./generate.log"

if [ ! -d ${PROTO_PATH} ]; then
    echo "Unable to locate definitions directory: ${PROTO_PATH}"
    exit 1
fi

echo "Generating new definitions in ${OUTPUT_DIR}"
if protoc \
    -I="${AKASH_DIR}/vendor/github.com/gogo/protobuf" \
    -I="${AKASH_DIR}/vendor/github.com/cosmos/cosmos-sdk/third_party/proto" \
    -I="${AKASH_DIR}/vendor/github.com/cosmos/cosmos-sdk/proto" \
    -I="${IBC_DIR}/proto" \
    --plugin="../akashjs/node_modules/.bin/protoc-gen-ts_proto" \
    --proto_path=${PROTO_PATH} \
    --ts_proto_out=${OUTPUT_DIR} \
    --ts_proto_opt=esModuleInterop=true,forceLong=long,useOptionals='messages',useExactTypes=false \
    ${SRC_PATHS}; then
    # Remove unnecessary codec files
    rm -rf \
    # "$OUTPUT_DIR/gogoproto/" \
    # "$OUTPUT_DIR/cosmos_proto/" \
    # "$OUTPUT_DIR/cosmos/" \
    # "$OUTPUT_DIR/google/"
    echo "ok";
else
    echo "Unable to regenerate protobuf files: error below"
    cat ${LOG_FILE}
    rm ${LOG_FILE}
fi

# {  "jsonrpc": "2.0",  "method": "subscribe",  "id": "0",  "params": {    "query": "recv_packet.packet_src_port='icacontroller-connection-0-owner-32'"  }}