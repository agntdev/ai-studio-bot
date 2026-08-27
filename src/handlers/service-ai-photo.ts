import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "📸 AI-фото", data: "service:ai_photo" }) if the toolkit exposes it.

registerMainMenuItem({ label: "📸 AI-фото", data: "service:ai_photo", order: 10 });
const composer = new Composer<Ctx>();

composer.callbackQuery("service:ai_photo", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "AI-фото для кампаний, карточек товаров и соцсетей.\n\nСоздадим выразительные визуалы в стиле вашего бренда без сложной съёмки.",
    { reply_markup: inlineKeyboard([[inlineButton("Оставить заявку", "application:start")], [inlineButton("Назад в меню", "menu:main")]]) },
  );
});

export default composer;
