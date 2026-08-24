const REPOSITORY_RAW = "https://raw.githubusercontent.com/s-n-t09/ThemesPlusPlus/main";

export default {
	iconpacks: {
		list: `${REPOSITORY_RAW}/iconpacks/list.json`,
		assets: `${REPOSITORY_RAW}/iconpacks/assets/`,
		tree: (iconpack: string) => `${REPOSITORY_RAW}/iconpacks/trees/${iconpack}.txt`,
		hashes: `${REPOSITORY_RAW}/iconpacks/trees/_hashes.txt`,
	},
};
