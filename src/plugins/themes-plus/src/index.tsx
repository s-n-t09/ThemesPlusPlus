import { storage } from "@vendetta/plugin";

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

const strings: Record<string, string> = {
	"settings.reload": "Reload",
	"settings.inactive.no_theme": "No theme is selected",
	"settings.inactive.themes_plus_unsupported": "The selected theme does not expose the Themes+ data format",
	"settings.inactive.no_iconpacks_list": "Could not fetch the iconpack index; cached data may still be used",
	"settings.inactive.no_iconpack_config": "Could not fetch the selected iconpack configuration",
	"settings.inactive.no_iconpack_files": "Could not fetch the selected iconpack file tree",
	"settings.patch.icons": "Custom icon colors",
	"settings.patch.custom_icon_overlays": "Custom icon overlays",
	"settings.patch.mention_line_color": "Custom message mention line color",
	"settings.patch.iconpack": "Custom iconpack",
	"modal.config.title": "Configuration",
	"modal.config.iconpack.title": "Iconpack",
	"modal.config.iconpack.mode": "Mode",
	"modal.config.iconpack.mode.automatic": "Automatic",
	"modal.config.iconpack.mode.automatic.desc": "Use the iconpack selected by the current theme",
	"modal.config.iconpack.mode.manual": "Manual",
	"modal.config.iconpack.mode.manual.desc": "Choose an iconpack manually",
	"modal.config.iconpack.mode.disabled": "Disabled",
	"modal.config.iconpack.mode.disabled.desc": "Use Discord's default icons",
	"modal.config.iconpack.choose": "Iconpack",
	"modal.config.iconpack.choose.custom": "Custom",
	"modal.config.iconpack.custom.url": "Base URL",
	"modal.config.iconpack.custom.url.desc": "The URL containing the iconpack files. Keep the trailing slash optional.",
	"modal.config.iconpack.custom.suffix": "Filename suffix",
	"modal.config.iconpack.custom.suffix.desc": "Appends text after the icon name for legacy iOS iconpacks. Leave empty for modern packs.",
	"modal.config.iconpack.custom.config.bigger_status": "Bigger status icons",
	"modal.config.iconpack.custom.config.bigger_status.desc": "Makes status icons slightly larger for legacy packs.",
	"modal.config.iconpack.custom.preview": "Preview icon",
};

export const basicFormat = (text: string) => text.replace(/\*\*(.*?)\*\*/g, "$1");
export const lang = {
	format(key: string, input: Record<string, any> = {}) {
		if (key === "settings.header") return `Themes++ is **${input.active ? "active" : "inactive"}**`;
		return strings[key] ?? key;
	},
	unload() {},
};

export let enabled = false;

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
