/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORLD_API_HTTP: string;
  readonly VITE_GATEWAY_HTTP: string;
  readonly VITE_API_URL: string;
  readonly VITE_MAP_URL: string;
  readonly VITE_USE_LOCAL_DATA: string;
  readonly VITE_ZKLOGIN_CLIENT_ID: string;
  readonly VITE_ZKLOGIN_REDIRECT_URI: string;
  readonly VITE_ZKLOGIN_NETWORK: string;
  readonly VITE_ZKLOGIN_OAUTH_PROVIDER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
