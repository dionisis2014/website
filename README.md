# Website

This repo contains the code for [www.dionisis.xyz](https://www.dionisis.xyz).

## Requirements

- yarn (tested with `yarn v4.0.2` via corepack)
- nodejs (tested with `node v21.6.2`)

## Running

After cloning this repository:
```shell
cd website
yarn install
```

To run the dev build, simply run `yarn docs:dev`.

## Building

To build for release simply use `yarn docs:build`. The output is in the `docs/.vitepress/dist` directory.
