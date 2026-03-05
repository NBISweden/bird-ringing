import { SWRConfig } from "swr"


export function NoCacheSWR({ children }: { children: React.ReactNode }) {
  /*
    HACK: This is a hack to quickly get around the fact that SWR caches
    all requests. This allows us to use `useSWRImmutable` as a way to call
    backend actions without accidentally running into cached results which
    would prevent the actions from running.
  */
  return (
    <SWRConfig value={{ provider: () => new Map() }}>
      {children}
    </SWRConfig>
  )
}