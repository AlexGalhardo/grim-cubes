import type { JSX } from "react";
import { Bar } from "../Bar/Bar";

export interface BossViewModel {
	name: string;
	hp: number;
	maxHp: number;
	/** 0 before the 50% summon, 1 after. */
	phase: number;
}

/** Boss HP bar at the top of the HUD (Art Bible 16.5): name, 28 px bar and the 50% phase marker. */
export function BossBar({ boss }: { boss: BossViewModel }): JSX.Element {
	return (
		<div
			className="absolute top-4 left-1/2 w-[70%] -translate-x-1/2 desktop:w-[60%]"
			data-testid="boss-bar"
		>
			<div className="mb-1 text-center font-display text-2xl">{boss.name}</div>
			<div className="relative">
				<Bar value={boss.hp} max={boss.maxHp} variant="boss" label={boss.name} />
				<span
					aria-hidden="true"
					className={`absolute top-0 left-1/2 h-full w-0.5 ${boss.phase > 0 ? "bg-iron-dark" : "bg-bone"}`}
				/>
			</div>
		</div>
	);
}

/** The 3 s banner while the boss enters (GDD 12.2); everything else on screen is frozen. */
export function BossIntro({ name }: { name: string }): JSX.Element {
	return (
		<div
			role="status"
			data-testid="boss-intro"
			className="pointer-events-none absolute inset-x-0 top-1/3 z-10 text-center font-display text-4xl text-blood-light [text-shadow:2px_2px_0_var(--color-night)]"
		>
			{name}
		</div>
	);
}
