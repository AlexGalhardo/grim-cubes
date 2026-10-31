import type { SaveNotice } from "@gc/core";
import type { JSX } from "react";

/** pt-BR texts until the i18n pipeline exists (SDD 07). */
const TEXT: Readonly<Record<SaveNotice, string>> = {
	newer: "Seu save é de uma versão mais nova do jogo. Nada será salvo nesta sessão para não perder progresso.",
	recovered: "O save principal estava ilegível; o backup anterior foi restaurado.",
	corrupt:
		"Não foi possível ler o save nem o backup. O texto original foi guardado e o progresso recomeça do zero.",
	unavailable: "O armazenamento do navegador não respondeu. Nada será salvo nesta sessão.",
};

export const noticeText = (notice: SaveNotice): string => TEXT[notice];

/** Banner for save problems; sits at the top and does not block play. */
export function Notice({ notice }: { notice: SaveNotice }): JSX.Element {
	return (
		<div
			role="alert"
			data-testid="save-notice"
			className="pointer-events-auto absolute top-2 left-1/2 z-40 w-[min(90vw,40rem)] -translate-x-1/2 border-2 border-rust bg-night-2 p-3 font-body text-sm text-bone"
		>
			{TEXT[notice]}
		</div>
	);
}
