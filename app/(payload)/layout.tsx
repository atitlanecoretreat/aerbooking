import type { ServerFunctionClient } from "payload";
import type { ReactNode } from "react";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import config from "@payload-config";

import { importMap } from "./admin/importMap";

import "@payloadcms/next/css";

type Props = {
  children: ReactNode;
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";

  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

export default function PayloadLayout({ children }: Props) {
  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
}
