import { ExternalLink } from "lucide-react";

export const Links = () => {
  return (
    <ul className="list-none sm:text-sm">
      <li>
        <div className="flex gap-2 text-[11px]">
          <a className="flex" href="https://github.com/w3f/jamtestvectors/pull/3/files" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-xs text-brand-dark dark:text-brand" />
          </a>
          <div>
            <p className="">JSON test file compatible with JAM TestVectors JSON</p>
            <p className="inline text-secondary-foreground">
              <small>
                Examples can be found in{" "}
                <a className="text-brand-dark underline dark:text-brand" href="https://github.com/w3f/jamtestvectors">
                  wf3/jamtestvectors
                </a>{" "}
                Github repo
              </small>
            </p>
          </div>
        </div>
      </li>

      <li>
        <div className="flex gap-2 text-[11px] mt-3">
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-brand-dark dark:text-brand" />
          </a>
          <div>
            <p className=""> JAM SPI program </p>
            <p className="inline text-secondary-foreground">
              <small>
                SPI program definition can be found in{" "}
                <a
                  className="text-brand-dark dark:text-brand underline"
                  href="https://graypaper.fluffylabs.dev/#/5b732de/2a7e022a7e02"
                >
                  a GrayPaper
                </a>
              </small>
            </p>
          </div>
        </div>
      </li>
      <li>
        <div className="flex gap-2 text-[11px] mt-3">
          <a href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600" target="_blank">
            <ExternalLink className="inline w-4 mb-1 mr-2 text-brand-dark dark:text-brand" />
          </a>
          <div>
            <p className="">JSON test file compatible with JAM TestVectors JSON</p>
            <p className="inline text-secondary-foreground">
              <small>
                Generic program definition can be found in{" "}
                <a
                  className="text-brand-dark dark:text-brand underline"
                  href="https://graypaper.fluffylabs.dev/#/5b732de/23c60023c600"
                >
                  a GrayPaper
                </a>
              </small>
            </p>
          </div>
        </div>
      </li>
    </ul>
  );
};
