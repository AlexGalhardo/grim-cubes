import en from "../../locales/en.json";
import ptBR from "../../locales/pt-BR.json";
import { i18n } from "../../packages/core/src/index";

// UI tests assert the shipped language (pt-BR); the English catalog is registered for the locale tests.
i18n.registerLocale("en", en);
i18n.registerLocale("pt-BR", ptBR);
i18n.setLocale("pt-BR");
