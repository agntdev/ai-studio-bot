import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "🎬 AI-видео", data: "service:ai_video" }) if the toolkit exposes it.

registerMainMenuItem({ label: "🎬 AI-видео", data: "service:ai_video", order: 20 });
const composer = new Composer<Ctx>();

composer.callbackQuery("service:ai_video", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "AI-видео для запусков, рекламы и социальных сетей.\n\nПревратим идею бренда в динамичный ролик, который удерживает внимание.",
    { reply_markup: inlineKeyboard([[inlineButton("Оставить заявку", "application:start")], [inlineButton("Назад в меню", "menu:main")]]) },
  );
});

export default composer;
