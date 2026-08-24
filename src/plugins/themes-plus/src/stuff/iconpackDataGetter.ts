import type { IconpackConfig } from "../types";
import constants from "./constants";
import { cFetch } from "./util";

export interface FetchedIconpackData {
	config: IconpackConfig | null;
	tree: string[] | null;
}

function normalizeTree(value: string) {
	return value
		.replaceAll("\r", "")
		.split("\n")
		.map(path => path.trim().replace(/^\/+/, ""))
		.filter(Boolean);
}

export default async function getIconpackData(
	id: string,
	configUrl?: string,
): Promise<FetchedIconpackData> {
	const treeUrl = constants.iconpacks.tree(id);
	const [config, tree] = await Promise.allSettled([
		configUrl
			? cFetch<IconpackConfig>(configUrl, undefined, "json")
			: Promise.resolve(null),
		cFetch(treeUrl),
	]);

	return {
		config: config.status === "fulfilled" && config.value
			? config.value
			: null,
		tree: tree.status === "fulfilled" ? normalizeTree(tree.value) : null,
	};
}
