"use client";
import { Config, ConfigContext, FeatureFlags } from "@/app/(system)/contexts";
import React from "react";
import useSWRImmutable from "swr/immutable";

function parseValue<T>(id: string, obj: unknown, parser: (v: unknown) => T): T {
  const record =
    typeof obj === "object" && obj !== null
      ? (obj as Record<string, string>)
      : null;
  if (record && id in record) {
    return parser(record[id]);
  }

  throw new Error(`Failed to parse config variable: ${id}`);
}

async function fetchConfig(url: string): Promise<Config> {
  const config = await (await fetch(url)).json();
  return {
    authUrl: parseValue("authUrl", config, String),
    apiRootUrl: parseValue("apiRootUrl", config, String),
    defaultLang: parseValue("defaultLang", config, String),
    flags: parseValue("flags", config, (value) =>
      value
        ? (Array.isArray(value) ? value : [value]).map(
            (v) => String(v) as FeatureFlags,
          )
        : undefined,
    ),
  };
}

export function ConfigProvider({
  children,
  configUrl,
  errorMessage,
  defaultConfig,
}: {
  children: React.ReactNode;
  configUrl: string;
  errorMessage?: React.ReactNode;
  defaultConfig?: Config;
}) {
  const {
    data: config,
    error,
    isLoading,
  } = useSWRImmutable(configUrl, fetchConfig, {
    shouldRetryOnError: false,
  });

  const activeConfig = isLoading ? undefined : config || defaultConfig;

  if (error && !activeConfig) {
    return errorMessage ? errorMessage : <></>;
  }
  return activeConfig === undefined ? (
    <></>
  ) : (
    <ConfigContext.Provider value={activeConfig}>
      {children}
    </ConfigContext.Provider>
  );
}
