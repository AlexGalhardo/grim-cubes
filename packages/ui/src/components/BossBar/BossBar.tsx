import { t } from "@gc/core";
import type { JSX } from "react";
import { Bar } from "../Bar/Bar";

export interface BossViewModel {
	name: string;
	hp: number;
	maxHp: number;
	/** 0 before the 50% summon, 1 after. */
	phase: number;
	/** HP fractions (0-1) where the fight changes phase: one tick on the bar for each. */
	phaseMarkers: readonly number[];
	/** Enrage stacks; above 0 the frame turns blood-light and pulses. */
	enrage: number;
}

/**
 * Boss bar in the top-centre of the HUD (Art Bible 16.5): a name plate, the 28 px bar with one tick per phase change
 * and a pip per phase. An enraged boss gets a blood-light frame that pulses in steps.
 */
export function BossBar({ boss }: { boss: BossViewModel }): JSX.Element {
	const phases = boss.phaseMarkers.length + 1;
	const current = Math.min(boss.phase, boss.phaseMarkers.length) + 1;
	return (
		<div
			className={`pointer-events-none w-[36vw] max-w-[880px] border-2 bg-night/65 p-1 desktop:w-[46vw] ${boss.enrage > 0 ? "animate-low border-blood-light" : "border-iron-dark"}`}
			data-testid="boss-bar"
			data-enraged={boss.enrage > 0}
		>
			<div className="mb-1 flex items-center justify-between gap-2 px-1">
				<div className="truncate font-display text-base text-bone uppercase desktop:text-2xl">
					{boss.name}
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{boss.enrage > 0 ? (
						<span
							data-testid="boss-enrage"
							className="font-display text-xs text-blood-light uppercase desktop:text-sm"
						>
							{t("boss.enraged")}
						</span>
					) : null}
					<div
						role="img"
						aria-label={t("boss.phase", { phase: current, total: phases })}
						data-testid="boss-phase-pips"
						className="flex gap-1"
					>
						{Array.from({ length: phases }, (_, i) => (
							<span
								// Fixed, ordered pips: the index is the identity.
								key={i}
								data-lit={i < current}
								className={`size-2 desktop:size-3 ${i < current ? "bg-ember-light" : "bg-iron-dark"}`}
							/>
						))}
					</div>
				</div>
			</div>
			<div className="relative">
				<Bar value={boss.hp} max={boss.maxHp} variant="boss" label={boss.name} />
				{boss.phaseMarkers.map((at) => (
					<span
						key={at}
						aria-hidden="true"
						data-testid="boss-phase-marker"
						style={{ left: `${at * 100}%` }}
						className={`absolute top-0 h-full w-0.5 ${boss.phase > 0 ? "bg-iron-dark" : "bg-bone"}`}
					/>
				))}
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
