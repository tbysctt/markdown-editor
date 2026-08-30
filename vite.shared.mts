import packageJson from './package.json' with { type: 'json' };

export const appVersionDefine = {
  __APP_VERSION__: JSON.stringify(packageJson.version),
};
