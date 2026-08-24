import type { PlusStructure } from "$/typings";

import { ConfigIconpackMode, enabled, InactiveReason, vstorage } from "..";
import patchIcons from "../patches/icons";
import patchMentionLineColors from "../patches/mentionLineColor";
import type { IconpackConfig, IconpackData } from "../types";
import { state, updateState } from "./active";
import constants from "./constants";
import getIconpackData, { type FetchedIconpackData } from "./iconpackDataGetter";
import { cFetch, customUrl } from "./util";

const UserStore = findByStoreName("UserStore");
export const patches: (() => void)[] = [];

function selectedThemeFrom(bunny: any) {
	const themes = bunny?.themes?.themes;
	if (Array.isArray(themes)) return themes.find((theme: any) => theme?.selected);
	if (themes && typeof themes === "object") {
		return Object.values(themes).find((theme: any) => theme?.selected) as any;
	}
	return bunny?.themes?.selectedTheme ?? bunny?.themes?.currentTheme;
}

async function fetchIconpackIndex() {
	const [list, hashes] = await Promise.allSettled([
		cFetch<IconpackData>(constants.iconpacks.list, undefined, "json"),
		cFetch(constants.iconpacks.hashes, undefined, "json"),
	]);

	if (list.status === "fulfilled" && Array.isArray(list.value?.list)) {
		state.iconpack.list = list.value.list;
	}
	if (hashes.status === "fulfilled" && hashes.value && typeof hashes.value === "object") {
		state.iconpack.hashes = hashes.value;
	}
}

export default async function load() {
	const { bunny } = window as any;
	for (const unpatch of patches.splice(0)) unpatch();

	state.loading = true;
	state.active = false;
	state.iconpack = { iconpack: undefined, list: [], hashes: {} };
	state.patches = [];
	state.inactive = [];
	updateState();

	try {
		let selectedTheme = selectedThemeFrom(bunny);
		if (!selectedTheme && vstorage.iconpack.mode === ConfigIconpackMode.Manual) {
			selectedTheme = { data: { plus: { version: 0 } } };
		}
		if (!selectedTheme) {
			state.inactive.push(InactiveReason.NoTheme);
			return;
		}

		const plusData = selectedTheme.data?.plus as PlusStructure | undefined;
		if (!plusData) {
			state.inactive.push(InactiveReason.ThemesPlusUnsupported);
			return;
		}

		const isCustomIconpack = Boolean(vstorage.iconpack.isCustom);
		const mode = vstorage.iconpack.mode;
		const requestedPack = mode === ConfigIconpackMode.Automatic
			? plusData.iconpack
			: mode === ConfigIconpackMode.Manual
			? vstorage.iconpack.pack
			: undefined;

		// Disabled mode and themes without an iconpack must still allow the
		// remaining color and overlay patches to load.
		if (mode !== ConfigIconpackMode.Disabled && !isCustomIconpack && requestedPack) {
			await fetchIconpackIndex();
		}

		const user = UserStore?.getCurrentUser?.() ?? { username: "User", id: "" };
		state.iconpack.iconpack = isCustomIconpack
			? {
				id: "custom-iconpack",
				name: "Custom iconpack",
				description: "A custom iconpack created by you.",
				credits: {
					authors: [{ name: user.username, id: user.id }],
					sources: [customUrl() || "N/A"],
				},
				config: undefined,
				suffix: vstorage.iconpack.custom.suffix,
				load: customUrl(),
			}
			: state.iconpack.list.find(pack => pack.id === requestedPack);

		let iconpackConfig: IconpackConfig = { biggerStatus: false };
		let tree: string[] = [];
		if (state.iconpack.iconpack && !isCustomIconpack) {
			let data: FetchedIconpackData;
			try {
				data = await getIconpackData(
					state.iconpack.iconpack.id,
					state.iconpack.iconpack.config,
				);
			} catch {
				data = { config: null, tree: null };
			}
			if (!data.tree) {
				if (!data.config) state.inactive.push(InactiveReason.NoIconpackConfig);
				state.inactive.push(InactiveReason.NoIconpackFiles);
				return;
			}
			tree = data.tree;
			if (data.config) iconpackConfig = data.config;
		} else if (isCustomIconpack) {
			iconpackConfig.biggerStatus = Boolean(
				vstorage.iconpack.custom.config?.biggerStatus,
			);
		}

		if (!enabled) return;
		state.active = true;
		patchIcons(plusData, tree, iconpackConfig);
		patchMentionLineColors(plusData);
	} catch (error) {
		console.log("Themes++ failed to load", error);
		state.inactive.push(InactiveReason.NoIconpacksList);
	} finally {
		state.loading = false;
		updateState();
	}
}
