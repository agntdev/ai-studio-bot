import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "💰 Прайс", data: "price:show" }) if the toolkit exposes it.

registerMainMenuItem({ label: "💰 Прайс", data: "price:show", order: 40 });
const composer = new Composer<Ctx>();

const PRICE_LIST = "📸 AI-фото — Старт\nДля одной визуальной идеи. По запросу.\n\n📸 AI-фото — Кампания\nДля серии брендовых материалов. По запросу.\n\n🎬 AI-видео — Старт\nДля короткого ролика. По запросу.\n\n🎬 AI-видео — Кампания\nДля видеоконтента под запуск. По запросу.\n\n📢 Реклама — Креатив\nДля рекламной концепции. По запросу.\n\n📢 Реклама — Под ключ\nДля комплексной кампании. По запросу.\n\nТочную стоимость подготовим после короткого брифа.";

composer.callbackQuery("price:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(PRICE_LIST, {
    reply_markup: inlineKeyboard([[inlineButton("Оставить заявку", "application:start")], [inlineButton("Назад в меню", "menu:main")]]),
  });
});

export default composer;
