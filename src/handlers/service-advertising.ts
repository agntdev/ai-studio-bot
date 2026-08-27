import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "📢 Реклама для брендов", data: "service:advertising" }) if the toolkit exposes it.

registerMainMenuItem({ label: "📢 Реклама для брендов", data: "service:advertising", order: 30 });
const composer = new Composer<Ctx>();

composer.callbackQuery("service:advertising", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    "Рекламные креативы, созданные под задачу бренда.\n\nПоможем сформулировать идею и подготовим контент для вашей кампании.",
    { reply_markup: inlineKeyboard([[inlineButton("Оставить заявку", "application:start")], [inlineButton("Назад в меню", "menu:main")]]) },
  );
});

export default composer;
