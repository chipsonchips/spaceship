# Upgrading SpaceshipGame

This repository uses the UUPS (Universal Upgradeable Proxy Standard) pattern for upgradeability.

## Prerequisites

- Foundry installed
- `PRIVATE_KEY` set in `.env`
- `USDC_ADDRESS` set in `.env`
- `BASESCAN_API_KEY` set in `.env` (for verification)

## Deployment

To deploy the initial version of the contract (Implementation + Proxy):

```bash
forge script script/DeploySpaceshipGame.s.sol:DeploySpaceshipGameScript --rpc-url <RPC_URL> --broadcast --verify
```

This will output the **Proxy Address**. Save this address!

## Upgrading

To upgrade the contract to a new implementation:

1. Modifiy `src/SpaceshipGame.sol` (keep storage layout compatible!)
2. Set `SPACESHIP_PROXY_ADDRESS` in your `.env` file to the address of the deployed proxy.
3. Run the upgrade script:

```bash
forge script script/UpgradeSpaceshipGame.s.sol:UpgradeSpaceshipGameScript --rpc-url <RPC_URL> --broadcast --verify
```

## Storage Layout

When upgrading, ensure you do not corrupt the storage layout.

- Do not remove existing state variables.
- Do not change the type or order of existing state variables.
- Add new variables at the end of the contract.

Check storage layout compatibility:

```bash
forge inspect SpaceshipGame storage-layout --pretty
```
