import { findByName, findByProps } from "@vendetta/metro";
import { React, ReactNative as RN } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
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
const jsxRuntime = findByProps("jsx", "jsxs");
const overlaySymbol = Symbol("themes-plus-plus-icon-overlay");
const transformedSymbol = Symbol("themes-plus-plus-icon-transformed");

type ImageProps = {
	source?: any;
	style?: any;
	ignore?: boolean;
	[key: string]: any;
};

function hasCustomOverlays(plus: PlusStructure) {
	const data = plus as PlusStructure & {
		customIconOverlays?: boolean;
		iconOverlays?: boolean;
	};
	if (data.customOverlays === true || data.customIconOverlays === true || data.iconOverlays === true) return true;
	if (data.customOverlays === false || data.customIconOverlays === false || data.iconOverlays === false) return false;

	// Older themes often shipped icon colors without the overlay capability flag.
	// Their check/radio assets are still compatible with the built-in overlay map.
	return Boolean(plus.icons && typeof plus.icons === "object");
}

function assetPathCandidates(asset: BunnyAsset) {
	const location = String(asset.httpServerLocation ?? "")
		.replaceAll("\\", "/")
		.replace(/^\/+/, "")
		.replace(/\/$/, "");
	const file = `${asset.name}.${asset.type || "png"}`;
	const candidates = location ? [fixPath(`${location}/${file}`)] : [];

	if (candidates[0]?.startsWith("_/external/")) {
		candidates.push(candidates[0].slice("_/external/".length));
	}
	if (candidates[0]?.startsWith("_/")) candidates.push(candidates[0].slice(2));

	// Kettu's public Asset type does not expose httpServerLocation. These are
	// the roots used by current Discord assets and by the bundled iconpacks.
	candidates.push(
		`design/components/Icon/native/redesign/generated/images/${file}`,
		`images/native/${file}`,
		`images/${file}`,
		`_/external/${file}`,
		file,
	);

	return [...new Set(candidates)];
}

function findIconPath(asset: BunnyAsset, tree: string[]) {
	const candidates = assetPathCandidates(asset);
	if (!tree.length) return candidates[0];

	const exact = candidates.find(path => tree.includes(path));
	if (exact) return exact;

	// A few packs preserve the same filename but use a different Discord asset
	// root. Prefer the first tree entry ending in the expected filename.
	const file = candidates.at(-1);
	return file ? tree.find(path => path.endsWith(`/${file}`) || path === file) : undefined;
}

function assetFromRegistry(value: any): BunnyAsset | null {
	const ids = [value, value?.id, value?.assetId, value?.asset?.id]
		.filter((id): id is number => typeof id === "number");
	for (const id of [...new Set(ids)]) {
		const asset = getAssetByID(id) as BunnyAsset | undefined;
		if (asset?.name) {
			return {
				...asset,
				httpServerLocation: asset.httpServerLocation ?? "",
				type: asset.type || "png",
			};
		}
	}
	return null;
}

function getThemedAsset(source: any): BunnyAsset | null {
	const candidate = Array.isArray(source) ? source[0] : source;
	const modIcon = Object.entries(modIcons).find(
		([, value]) => candidate?.uri === value.raw,
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

	const registryAsset = assetFromRegistry(candidate);
	if (registryAsset) return registryAsset;

	if (candidate && typeof candidate.name === "string") {
		return {
			httpServerLocation: String(candidate.httpServerLocation ?? ""),
			width: Number(candidate.width) || 64,
			height: Number(candidate.height) || 64,
			name: candidate.name,
			type: candidate.type || "png",
		};
	}

	if (
		candidate
		&& typeof candidate.uri === "string"
		&& typeof candidate.width === "number"
		&& typeof candidate.height === "number"
	) {
		const uriPath = candidate.uri.split(/[?#]/, 1)[0].replaceAll("\\", "/");
		const filePath = typeof candidate.file === "string"
			? candidate.file
			: /\.(?:png|jpe?g|webp|gif|bmp)$/i.test(uriPath)
			? uriPath
			: "";
		const normalizedPath = filePath.replaceAll("\\", "/");
		const segments = normalizedPath.split("/");
		const file = segments.pop() ?? "";
		const extensionIndex = file.lastIndexOf(".");
		const isDiscordAsset = Boolean(
			candidate.allowIconTheming
			|| /(?:^|\/)(?:design|images|modules|assets)\//i.test(normalizedPath)
			|| extensionIndex > 0 && !candidate.uri.startsWith("data:"),
		);
		if (isDiscordAsset && extensionIndex > 0) {
			return {
				httpServerLocation: `//_/external/${segments.join("/")}`.replace(/\/$/, ""),
				width: candidate.width,
				height: candidate.height,
				name: file.slice(0, extensionIndex),
				type: file.slice(extensionIndex + 1),
			};
		}
	}

	if (typeof source === "number" || candidate !== source) return assetFromRegistry(source);
	return null;
}

function withOverlay(ret: any, overlay: any) {
	return overlay?.children
		? (
			<RN.View>
				{ret}
				{overlay.children}
			</RN.View>
		)
		: ret;
}

function isImageLikeComponent(type: any, props: any) {
	if (!type) return false;
	if (type === RN.Image || type?.default === RN.Image || type?.type === RN.Image || type?.render === RN.Image) {
		return true;
	}
	const name = String(type.displayName || type.name || type.render?.displayName || "");
	return /image|icon/i.test(name) && Boolean(props && Object.prototype.hasOwnProperty.call(props, "source"));
}

function transformElementArgs(
	args: any[],
	plus: PlusStructure,
	tree: string[],
	iconpack: NonNullable<typeof state.iconpack.iconpack>,
	customOverlays: boolean,
) {
	const props = args?.[1];
	return isImageLikeComponent(args?.[0], props)
		? [args[0], ...transformImageArgs([props], plus, tree, iconpack, customOverlays), ...args.slice(2)]
		: args;
}

function transformImageArgs(
	args: any[],
	plus: PlusStructure,
	tree: string[],
	iconpack: NonNullable<typeof state.iconpack.iconpack>,
	customOverlays: boolean,
) {
	const cloned = [...args] as [ImageProps, ...any[]];
	const originalProps = cloned[0];
	if (!originalProps || originalProps.ignore || originalProps[transformedSymbol]) return cloned;

	const props = { ...originalProps };
	cloned[0] = props;
	const source = props.source;
	const asset = getThemedAsset(source);
	if (!asset?.name) return cloned;

	const iconPath = iconpack ? findIconPath(asset, tree) : undefined;
	const useIconpack = Boolean(iconpack?.load && iconPath);

	if (customOverlays && !useIconpack && typeof source === "number") {
		const overlay = getIconOverlay(plus, source, props.style);
		if (overlay) {
			Object.defineProperty(props, overlaySymbol, {
				value: overlay,
				enumerable: false,
				configurable: true,
			});
			if (overlay.replace) props.source = getAssetIDByName(overlay.replace);
			if (overlay.style) props.style = [props.style, overlay.style];
		}
	}

	if (plus.icons) {
		const tint = getIconTint(plus, source, asset.name);
		if (tint) props.style = [props.style, { tintColor: tint }];
	}

	if (useIconpack) {
		props.source = {
			uri: joinUrl(iconpack!.load, iconPath!),
			headers: { "cache-control": "public, max-age=3600" },
			width: asset.width,
			height: asset.height,
			original: source,
		};
	}

	Object.defineProperty(props, transformedSymbol, {
		value: true,
		enumerable: false,
		configurable: true,
	});
	return cloned;
}

export default function patchIcons(
	plus: PlusStructure,
	tree: string[],
	config: IconpackConfig,
) {
	const { iconpack } = state.iconpack;
	const customOverlays = hasCustomOverlays(plus);

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

	if (!plus.icons && !customOverlays && !iconpack) return;
	if (plus.icons) state.patches.push(PatchType.Icons);
	if (customOverlays) state.patches.push(PatchType.CustomIconOverlays);
	if (iconpack) state.patches.push(PatchType.Iconpack);

	// Newer Discord builds expose Image as a function component. Transforming
	// the React element arguments catches components that captured Image before
	// the legacy RN.Image property hook was installed.
	patches.push(
		after("Image", RN, (args, ret) => withOverlay(ret, args?.[0]?.[overlaySymbol])),
		before("Image", RN, args => transformImageArgs(args, plus, tree, iconpack, customOverlays)),
		after("createElement", React, (args, ret) => withOverlay(ret, args?.[1]?.[overlaySymbol])),
		before("createElement", React, args => transformElementArgs(args, plus, tree, iconpack, customOverlays)),
	);
	if (typeof jsxRuntime?.jsx === "function") {
		patches.push(
			after("jsx", jsxRuntime, (args, ret) => withOverlay(ret, args?.[1]?.[overlaySymbol])),
			before("jsx", jsxRuntime, args => transformElementArgs(args, plus, tree, iconpack, customOverlays)),
		);
	}
	if (typeof jsxRuntime?.jsxs === "function") {
		patches.push(
			after("jsxs", jsxRuntime, (args, ret) => withOverlay(ret, args?.[1]?.[overlaySymbol])),
			before("jsxs", jsxRuntime, args => transformElementArgs(args, plus, tree, iconpack, customOverlays)),
		);
	}

}
