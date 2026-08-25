import { useCacheStore } from "../stores/CacheStore";
import { vstorage } from "./storage";

export function customUrl() {
	const rawUrl = String(vstorage.iconpack?.custom?.url ?? "").trim();
	if (!rawUrl || rawUrl === "https://example.com") return "";
	return rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`;
}

export function joinUrl(base: string, path: string) {
	return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function fixPath(path: string) {
	const normalized = path.replaceAll("\\", "/").replace(/^\/+/, "");
	return normalized.startsWith("../") ? `_/${normalized.slice(3)}` : normalized;
}

export function flattenFilePath(path: string) {
	return path.replace(/[\\/]/g, "_").replace(/-/g, "");
}

export function cFetch(
	url: RequestInfo,
	init?: RequestInit,
	format?: "text",
): Promise<string>;
export function cFetch<JsonType>(
	url: RequestInfo,
	init?: RequestInit,
	format?: "json",
): Promise<JsonType>;

export async function cFetch(
	url: RequestInfo,
	init?: RequestInit,
	format = "text",
) {
	const cache = useCacheStore.getState();
	const rawUrl = typeof url === "string" ? url : url.url;
	let ret: string;

	try {
		const res = await fetch(url, init);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		ret = await res.text();
		cache.writeCache(rawUrl, ret);
	} catch (error) {
		if (!cache.isCached(rawUrl)) throw error;
		ret = cache.readCache(rawUrl);
	}

	if (format === "json") return JSON.parse(ret);
	return ret;
}
