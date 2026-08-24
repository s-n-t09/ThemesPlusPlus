import { Lang } from "$/lang/index";

import Settings from "./components/Settings";
import load, { patches } from "./stuff/loader";

export enum PatchType {
	Icons = "icons",
	CustomIconOverlays = "custom_icon_overlays",
	MentionLineColor = "mention_line_color",
	Iconpack = "iconpack",
}

export enum InactiveReason {
	NoTheme = "no_theme",
	ThemesPlusUnsupported = "themes_plus_unsupported",
	NoIconpacksList = "no_iconpacks_list",
	NoIconpackConfig = "no_iconpack_config",
	NoIconpackFiles = "no_iconpack_files",
}

export enum ConfigIconpackMode {
	Automatic = "automatic",
	Manual = "manual",
	Disabled = "disabled",
}

export const vstorage = storage as {
	iconpack: {
		mode: ConfigIconpackMode;
		pack?: string;
		custom: {
			url: string;
			suffix: string;
			config: { biggerStatus: boolean };
		};
		isCustom: boolean;
	};
};

export let enabled = false;
export const lang = new Lang("themes_plus");

export function onLoad() {
	vstorage.iconpack ??= {
		mode: ConfigIconpackMode.Automatic,
		custom: {
			url: "https://raw.githubusercontent.com/mudrhiod/discord-iconpacks/master/plus/solar-duotone/",
			suffix: "",
			config: { biggerStatus: false },
		},
		isCustom: false,
	};
	vstorage.iconpack.custom ??= {
		url: "",
		suffix: "",
		config: { biggerStatus: false },
	};
	vstorage.iconpack.custom.config ??= { biggerStatus: false };
	vstorage.iconpack.mode ??= ConfigIconpackMode.Automatic;
	vstorage.iconpack.isCustom ??= false;
	enabled = true;
	void load().catch(error => console.log("Themes++ failed to load", error));
}

export function onUnload() {
	enabled = false;
	lang.unload();
	for (const unpatch of patches.splice(0)) unpatch();
}

export const settings = Settings;
