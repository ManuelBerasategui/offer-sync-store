import { t as TSS_SERVER_FUNCTION } from "./server-BSCRlM9_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/createServerRpc-prIP6Hrh.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
export { createServerRpc as t };
