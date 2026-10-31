import type { AudioEngine, PlayOptions } from "./audioEngine";

/** Lines per moment (`voice_merchant_<moment>_<n>`, n from 1; captions `voice.merchant.<moment>_<n>`). */
export const MERCHANT_LINES = { arrive: 3, wait: 4, come: 3, buy: 4, nomoney: 3, farewell: 3 } as const;
export type MerchantMoment = keyof typeof MERCHANT_LINES;

const VOICE: PlayOptions = { priority: "boss", maxVoices: 1, pitchSpread: 0 };

export interface MerchantVoice {
	/** Says the next line of `moment` (they take turns, so the same line never plays twice in a row). */
	say(moment: MerchantMoment): void;
}

export function createMerchantVoice(
	engine: Pick<AudioEngine, "play">,
	onCaption: (key: string) => void,
): MerchantVoice {
	const next: Record<MerchantMoment, number> = {
		arrive: 0,
		wait: 0,
		come: 0,
		buy: 0,
		nomoney: 0,
		farewell: 0,
	};
	return {
		say(moment): void {
			const n = (next[moment] % MERCHANT_LINES[moment]) + 1;
			next[moment]++;
			engine.play(`voice_merchant_${moment}_${n}`, VOICE);
			onCaption(`voice.merchant.${moment}_${n}`);
		},
	};
}
