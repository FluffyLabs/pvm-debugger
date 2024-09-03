# PVM disassembler & debugger

Live @ https://pvm.fluffylabs.dev

## Requirements

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
