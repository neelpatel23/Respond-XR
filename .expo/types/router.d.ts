/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/emergency` | `/emergency`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/emergency/run` | `/emergency/run`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/history` | `/history`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/emergency` | `/emergency`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/emergency/run` | `/emergency/run`; params?: Router.UnknownOutputParams; } | { pathname: `${'/(tabs)'}/history` | `/history`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/emergency${`?${string}` | `#${string}` | ''}` | `/emergency${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/emergency/run${`?${string}` | `#${string}` | ''}` | `/emergency/run${`?${string}` | `#${string}` | ''}` | `${'/(tabs)'}/history${`?${string}` | `#${string}` | ''}` | `/history${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/emergency` | `/emergency`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/emergency/run` | `/emergency/run`; params?: Router.UnknownInputParams; } | { pathname: `${'/(tabs)'}/history` | `/history`; params?: Router.UnknownInputParams; };
    }
  }
}
