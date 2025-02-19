import { ExternalLink } from "lucide-react";

export const Links = () => {
  return (
    <ul className="list-none p-4">
      <li>
        <p>
          <a className="inline" href="https://github.com/w3f/jamtestvectors/pull/3/files" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-1 text-blue-600" />
          </a>
          JSON test file compatible with JAM TestVectors JSON
        </p>
        <p className="inline ml-5">
          <small>Examples can be found in wf3/jamtestvectors Github repo</small>
        </p>
      </li>
      <li>
        <p>
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-1 text-blue-600" />
          </a>
          JAM SPI program
        </p>
        <p className="inline ml-5">
          <small>SPI program definition can be found ina GrayPaper</small>
        </p>
      </li>
      <li>
        <p>
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-1 text-blue-600" />
          </a>
          Generic PVM program
        </p>
        <p className="inline ml-5">
          <small>Generic program definition can be found in a GrayPaper</small>
        </p>
      </li>
    </ul>
  );
};
