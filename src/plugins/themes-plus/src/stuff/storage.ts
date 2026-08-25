import { storage } from "@vendetta/plugin";

export interface ThemesPlusStorage {
	iconpack: {
		mode: "automatic" | "manual" | "disabled";
		pack?: string;
		custom: {
			url: string;
			suffix: string;
			config: { biggerStatus: boolean };
		};
		isCustom: boolean;
	};
}

export const vstorage = storage as ThemesPlusStorage;
