import { runMigration } from "$/migration";

const symbol = Symbol.for("nexpid revenge migration");
if (!window[symbol]) {
	window[symbol] = true;

	runMigration();
}
