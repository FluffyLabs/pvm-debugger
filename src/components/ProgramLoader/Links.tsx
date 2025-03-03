import { ExternalLink } from "lucide-react";

export const Links = () => {
  return (
    <ul className="list-none sm:text-sm">
      <li>
        <p>
          <a className="inline" href="https://github.com/w3f/jamtestvectors/pull/3/files" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-brand-dark" />
          </a>
          JSON test file compatible with JAM TestVectors JSON
        </p>
        <p className="inline ml-6 text-secondary-foreground">
          <small>
            Examples can be found in{" "}
            <a className="text-brand-dark" href="https://github.com/w3f/jamtestvectors">
              wf3/jamtestvectors
            </a>{" "}
            Github repo
          </small>
        </p>
      </li>
      <li>
        <p>
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-brand-dark" />
          </a>
          JAM SPI program
        </p>
        <p className="inline ml-6 text-secondary-foreground">
          <small>
            SPI program definition can be found in{" "}
            <a className="text-brand-dark underline" href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02">
              a GrayPaper
            </a>
          </small>
        </p>
      </li>
      <li>
        <p>
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-brand-dark" />
          </a>
          Generic PVM program
        </p>
        <p className="inline ml-6 text-secondary-foreground">
          <small>
            Generic program definition can be found in{" "}
            <a className="text-brand-dark underline" href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600">
              a GrayPaper
            </a>
          </small>
        </p>
      </li>
    </ul>
  );
};
