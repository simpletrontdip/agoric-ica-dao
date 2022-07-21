CHAIN_AG=simagoric
CHAIN_COSMOS=theta-testnet-001

HERMES=docker run --rm -vhermes-home:/home/hermes:z -v$$PWD:/config hermes:v1.0.0-rc.0 --config /config/hermes.config
KEYFILE=ibc-relay-mnemonic

task/restore-keys: $(KEYFILE) task/hermes-image task/hermes-volume hermes.config
	MNEMONIC="$$(cat $(KEYFILE))"; \
	echo $$MNEMONIC | sha1sum ; \
	$(HERMES) keys add --chain $(CHAIN_AG) --mnemonic-file /config/$(KEYFILE) --hd-path "m/44'/564'/0'/0/0"; \
	$(HERMES) keys add --chain $(CHAIN_COSMOS) --mnemonic-file /config/$(KEYFILE); 
	mkdir -p task && touch $@

# ISSUE: these are the results of task/restore-keys
ADDR_AG=agoric12t2yqeg4pdne7w7fadacvp8l8afevdsumhtswr
ADDR_COSMOS=cosmos1h68l7uqw255w4m2v82rqwsl6p2qmkrg08u5mye

start: task/create-connection
	docker-compose up -d

task/create-connection: hermes.config task/hermes-image task/hermes-volume \
		task/restore-keys task/tap-cosmos-faucet task/tap-agoric-faucet
	$(HERMES) create connection --a-chain $(CHAIN_COSMOS) --b-chain $(CHAIN_AG)
	mkdir -p task && touch $@

task/hermes-image: docker-compose.yml hermes.Dockerfile
	docker-compose build
	mkdir -p task && touch $@

hermes.Dockerfile:
	wget https://raw.githubusercontent.com/informalsystems/ibc-rs/master/ci/hermes.Dockerfile

task/hermes-volume:
	docker volume create hermes-home
	mkdir -p task && touch $@

task/tap-cosmos-faucet: hermes.config
	@echo tapping faucet
	@echo goto discord channel https://discord.com/channels/669268347736686612/953697793476821092
	@echo paste "$request cosmos1h68l7uqw255w4m2v82rqwsl6p2qmkrg08u5mye theta"
	mkdir -p task && touch $@

# gaiad keys add relayer --recover
# (enter relayer mnemonic)
# gaiad tx ibc-transfer transfer transfer channel-5 agoric1ajygmq6gsaywng5xc35ahznls3tjgg7z2ggepe 15000000uakt --from relayer --node=http://13.250.11.206:26657 --chain-id edgenet-1 --yes --fees=5000uakt

task/tap-agoric-faucet: hermes.config
	@echo tapping agoric faucet
	@echo agoric address $(ADDR_AG)
	agd --home=../_agstate/keys tx bank send -ojson --keyring-backend=test --gas=auto --gas-adjustment=1.2 --broadcast-mode=block --yes --chain-id=$(CHAIN_AG) --node=tcp://localhost:26657 provision $(ADDR_AG) 13000000ubld,50000000urun
	mkdir -p task && touch $@
