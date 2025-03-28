# PVM disassembler & debugger

- **Production @ https://pvm.fluffylabs.dev**
- Beta @ https://pvm-debugger.netlify.app/

## PVMs support

We have the following PVMs integrated by default.

- [x] [typeberry](https://github.com/fluffylabs/typeberry) - TypeScript implementation
- [x] [anan-as](https://github.com/tomusdrw/ananas) - AssemblyScript implementation (as WASM)
- [x] [polkavm](https://github.com/paritytech/polkavm) - Rust implementation (as WASM)

There are few ways how you can add your own PVM to execute the code.

1. Upload WASM (supported interfaces: wasm-bindgen, assembly script, Go)
2. Point to an URL with metadata file (details in #81; example [pvm-metadata.json](https://github.com/tomusdrw/polkavm/blob/gh-pages/pvm-metadata.json))
3. Connect to WebSocket interface: [example & docs](https://github.com/wkwiatek/pvm-ws-rpc).

Details about the API requirements can be found in [#81](https://github.com/FluffyLabs/pvm-debugger/issues/81)

## Development

### Requirements

```bash
$ node --version
v 22.1.0
```

We recommend [NVM](https://github.com/nvm-sh/nvm) to install and manage different
`node` versions.

### Installing dependencies

```bash
$ npm ci
```

### Start a development version

```bash
$ npm run dev
```

### Building

```bash
$ npm run build
```

The static files with the website can then be found in `./dist` folder.

You can display them for instance with `http-server`:

```bash
$ npx http-server -o
```

### Running formatting & linting

```bash
$ npm run lint
```
