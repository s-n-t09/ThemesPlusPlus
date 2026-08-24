import { RNCacheModule, zustand, zustandMW } from "$/deps";

interface CacheState {
	cache: Record<string, string>;
	isCached: (link: string) => boolean;
	writeCache: (link: string, data: unknown) => void;
	readCache: (link: string) => unknown;
}

export const useCacheStore = zustand.create<
	CacheState,
	[["zustand/persist", { cache: CacheState["cache"] }]]
>(
	zustandMW.persist(
		(set, get) => ({
			cache: {},
			isCached: link => typeof get().cache[link] === "string",
			writeCache: (link, data) => {
				try {
					set({
						cache: { ...get().cache, [link]: JSON.stringify(data) },
					});
				} catch {
					// A failed cache write must never prevent the plugin from loading.
				}
			},
			readCache: link => {
				const value = get().cache[link];
				if (typeof value !== "string") return null;
				try {
					return JSON.parse(value);
				} catch {
					return null;
				}
			},
		}),
		{
			name: "themes-plus-cache",
			storage: zustandMW.createJSONStorage(() => RNCacheModule),
			partialize: state => ({ cache: state.cache }),
		},
	),
);
