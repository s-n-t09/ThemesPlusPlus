import { findByName } from "@vendetta/metro";
import { ReactNative as RN } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { getAssetByID, getAssetIDByName } from "@vendetta/ui/assets";

import type { PlusStructure } from "$/typings";

import { PatchType } from "..";
import { state } from "../stuff/active";
import { getIconOverlay, getIconTint } from "../stuff/iconOverlays";
import { patches } from "../stuff/loader";
import modIcons from "../stuff/modIcons";
import { fixPath, joinUrl } from "../stuff/util";
import type { BunnyAsset, IconpackConfig } from "../types";

const Status = findByName("Status", false);

type ImageProps = {
	source?: any;
	style?: any;
	ignore?: boolean;
	[key: string]: any;
};

function assetPathCandidates(asset: BunnyAsset) {
	const location = String(asset.httpServerLocation ?? "")
		.replaceAll("\\", "/")
		.replace(/^\/+/, "");
	const file = `${asset.name}.${asset.type}`;
	const primary = fixPath(`${location}/${file}`);
	const candidates = [primary];

	// Some third-party packs omit the generated `_/external` prefix.
	if (primary.startsWith("_/external/")) {
		candidates.push(primary.slice("_/external/".length));
	}
	if (primary.startsWith("_/")) candidates.push(primary.slice(2));

	return [...new Set(candidates)];
}

function findIconPath(asset: BunnyAsset, tree: string[]) {
	const candidates = assetPathCandidates(asset);
	if (!tree.length) return candidates[0];
	return candidates.find(path => tree.includes(path));
}

function getThemedAsset(source: any): BunnyAsset | null {
	const modIcon = Object.entries(modIcons).find(
		([, value]) => source?.uri === value.raw,
	);
	if (modIcon) {
		return {
			httpServerLocation: "//_/",
			width: 64,
			height: 64,
			name: modIcon[0],
			type: "png",
		};
	}

	if (
		source
		&& typeof source.uri === "string"
		&& typeof source.width === "number"
		&& typeof source.height === "number"
		&& typeof source.file === "string"
		&& source.allowIconTheming
	) {
		const segments = source.file.replaceAll("\\", "/").split("/");
		const file = segments.pop() ?? "";
		const extensionIndex = file.lastIndexOf(".");
		if (extensionIndex <= 0) return null;

		return {
			httpServerLocation: `//_/external/${segments.join("/")}`.replace(/\/$/, ""),
			width: source.width,
			height: source.height,
			name: file.slice(0, extensionIndex),
			type: file.slice(extensionIndex + 1),
		};
	}

	if (typeof source === "number") return (getAssetByID(source) as BunnyAsset) ?? null;
	return null;
}

export default function patchIcons(
	plus: PlusStructure,
	tree: string[],
	config: IconpackConfig,
) {
	const { iconpack } = state.iconpack;
	if (config.biggerStatus && Status) {
		patches.push(
			before("default", Status, ([props], ...args) => [
				{
					...props,
					size: Math.floor((props?.size ?? 0) * 1.5),
				},
				...args,
			]),
		);
	}

	if (!plus.icons && !plus.customOverlays && !iconpack) return;
	if (plus.icons) state.patches.push(PatchType.Icons);
	if (plus.customOverlays) state.patches.push(PatchType.CustomIconOverlays);
	if (iconpack) state.patches.push(PatchType.Iconpack);

	// RN.Image became a function component in newer Discord builds. Patching its
	// old `.render` method (or replacing the method with `instead`) no longer
	// consistently intercepts calls, so mutate the props with a before-hook.
	patches.push(
		before("Image", RN, args => {
			const cloned = [...args] as [ImageProps, ...any[]];
			const originalProps = cloned[0];
			if (!originalProps || originalProps.ignore) return cloned;

			const props = { ...originalProps };
			cloned[0] = props;
			const source = props.source;
			const asset = getThemedAsset(source);
			if (!asset?.httpServerLocation) return cloned;

			const iconPath = iconpack ? findIconPath(asset, tree) : undefined;
			const useIconpack = Boolean(iconpack?.load && iconPath);

			let overlay: any;
			if (plus.customOverlays && !useIconpack && typeof source === "number") {
				overlay = getIconOverlay(plus, source, props.style);
				if (overlay?.replace) props.source = getAssetIDByName(overlay.replace);
				if (overlay?.style) props.style = [props.style, overlay.style];
			}

			if (plus.icons) {
				const tint = getIconTint(plus, source, asset.name);
				if (tint) props.style = [props.style, { tintColor: tint }];
			}

			if (useIconpack) {
				props.source = {
					uri: joinUrl(iconpack!.load, iconPath!),
					headers: {
						"cache-control": "public, max-age=3600",
					},
					width: asset.width,
					height: asset.height,
					original: source,
				};
			}

			return cloned;
		}),
	);
}
