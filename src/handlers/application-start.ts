import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { adminChatId, inlineButton, inlineKeyboard, registerMainMenuItem, requireOwner } from "../toolkit/index.js";
import type { StoredApplication } from "../toolkit/session/durable.js";

// SCAFFOLD — generated from the bot blueprint BEFORE the agent runs.
// Keep a LIVE registration (.command / .callbackQuery / …) so this feature is
// never an empty stub. Replace the reply body with real logic + copy; if you
// change the user-facing text, update tests/specs to match EXACTLY.
// Do NOT rewrite src/bot.ts — buildBot() already auto-loads this module.
// Menu: wire this into /start via registerMainMenuItem({ label: "📝 Оставить заявку", data: "application:start" }) if the toolkit exposes it.

type DurableApplicationsEnv = {
  CHAT_DO?: {
    idFromName(name: string): unknown;
    get(id: unknown): { fetch(input: string, init?: { method?: string; body?: string }): Promise<Response> };
  };
};

let applicationClock: () => Date = () => new Date();
/** Test seam for timestamps; production always uses the current clock. */
export function setApplicationClockForTests(clock: () => Date): void {
  applicationClock = clock;
}

registerMainMenuItem({ label: "📝 Оставить заявку", data: "application:start", order: 50 });
registerMainMenuItem({ label: "📋 Заявки", data: "application:desk", order: 70 });
const composer = new Composer<Ctx>();

const serviceKeyboard = inlineKeyboard([
  [inlineButton("AI-фото", "application:service:photo")],
  [inlineButton("AI-видео", "application:service:video")],
  [inlineButton("Реклама для бренда", "application:service:advertising")],
  [inlineButton("Назад в меню", "menu:main")],
]);

function clearForm(ctx: Ctx): void {
  ctx.session.applicationStep = undefined;
  ctx.session.applicationService = undefined;
  ctx.session.applicationRequirements = undefined;
  ctx.session.applicationHasMaterials = undefined;
  ctx.session.applicationAttachments = undefined;
}

function contactPrompt() {
  return {
    force_reply: true as const,
    input_field_placeholder: "Телефон или @username",
  };
}

async function persistApplication(ctx: Ctx, record: StoredApplication): Promise<boolean> {
  const env = (ctx as Ctx & { env?: DurableApplicationsEnv }).env;
  const namespace = env?.CHAT_DO;
  if (!namespace) return false;
  try {
    const stub = namespace.get(namespace.idFromName("applications"));
    const response = await stub.fetch("https://do/applications", {
      method: "POST",
      body: JSON.stringify(record),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function applicationsNamespace(ctx: Ctx): DurableApplicationsEnv["CHAT_DO"] | undefined {
  return (ctx as Ctx & { env?: DurableApplicationsEnv }).env?.CHAT_DO;
}

async function readApplications(ctx: Ctx): Promise<StoredApplication[] | undefined> {
  const namespace = applicationsNamespace(ctx);
  if (!namespace) return undefined;
  try {
    const response = await namespace.get(namespace.idFromName("applications")).fetch("https://do/applications");
    if (!response.ok) return undefined;
    return (await response.json()) as StoredApplication[];
  } catch {
    return undefined;
  }
}

async function updateApplicationStatus(ctx: Ctx, id: string, status: StoredApplication["status"]): Promise<boolean> {
  const namespace = applicationsNamespace(ctx);
  if (!namespace) return false;
  try {
    const response = await namespace.get(namespace.idFromName("applications")).fetch("https://do/applications", {
      method: "PATCH",
      body: JSON.stringify({ id, status }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function deskView(records: StoredApplication[]) {
  if (records.length === 0) {
    return { text: "Новых заявок пока нет.", keyboard: inlineKeyboard([[inlineButton("Назад в меню", "menu:main")]]) };
  }
  const recent = records.slice(-5).reverse();
  const statusLabel: Record<StoredApplication["status"], string> = { new: "новая", in_progress: "в работе", done: "готово" };
  return {
    text: recent.map((record, i) => `${i + 1}. ${record.serviceType} — ${statusLabel[record.status]}\n${record.contactInfo}`).join("\n\n"),
    keyboard: inlineKeyboard([
      ...recent.flatMap((record) => [
        [inlineButton("В работу", `application:status:${record.id}:in_progress`), inlineButton("Готово", `application:status:${record.id}:done`)],
      ]),
      [inlineButton("Обновить", "application:desk"), inlineButton("Назад в меню", "menu:main")],
    ]),
  };
}

function attachmentFromMessage(ctx: Ctx): { kind: string; messageId: number } | undefined {
  const message = ctx.message;
  if (!message) return undefined;
  if (message.photo) return { kind: "фото", messageId: message.message_id };
  if (message.document) return { kind: "документ", messageId: message.message_id };
  if (message.video) return { kind: "видео", messageId: message.message_id };
  return undefined;
}

composer.callbackQuery("application:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  clearForm(ctx);
  await ctx.editMessageText("Выберите услугу — подготовим предложение под вашу задачу.", { reply_markup: serviceKeyboard });
});

composer.callbackQuery(/^application:service:(photo|video|advertising)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const labels: Record<string, string> = { photo: "AI-фото", video: "AI-видео", advertising: "Реклама для бренда" };
  ctx.session.applicationService = labels[ctx.match[1]];
  ctx.session.applicationStep = "requirements";
  ctx.session.applicationAttachments = [];
  await ctx.editMessageText(
    "Опишите задачу: цель, формат и желаемый результат.\n\nМожно прикрепить фото, видео или документ с подписью.",
    { reply_markup: inlineKeyboard([[inlineButton("Отменить", "application:cancel")]]) },
  );
});

composer.callbackQuery("application:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  clearForm(ctx);
  await ctx.editMessageText("Заявка отменена. Когда будете готовы, начните снова.", {
    reply_markup: inlineKeyboard([[inlineButton("Назад в меню", "menu:main")]]),
  });
});

composer.callbackQuery(/^application:materials:(yes|no)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!ctx.session.applicationRequirements || !ctx.session.applicationService) {
    clearForm(ctx);
    await ctx.editMessageText("Данные заявки не сохранились. Начните форму ещё раз.", { reply_markup: serviceKeyboard });
    return;
  }
  ctx.session.applicationHasMaterials = ctx.match[1] === "yes";
  ctx.session.applicationStep = "contact";
  await ctx.editMessageText("Оставьте телефон или @username. Используем его только для связи по этой заявке.");
  await ctx.reply("Напишите контакт одним сообщением.", { reply_markup: contactPrompt() });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.applicationStep === "requirements") {
    const requirements = ctx.message.text.trim();
    if (requirements.length < 10) {
      await ctx.reply("Опишите задачу чуть подробнее — минимум 10 символов.", { reply_markup: contactPrompt() });
      return;
    }
    ctx.session.applicationRequirements = requirements;
    await ctx.reply("У вас есть готовые материалы для проекта?", {
      reply_markup: inlineKeyboard([[inlineButton("Да, есть", "application:materials:yes"), inlineButton("Нет, нужны с нуля", "application:materials:no")], [inlineButton("Отменить", "application:cancel")]]),
    });
    return;
  }

  if (ctx.session.applicationStep !== "contact") return next();
  const contact = ctx.message.text.trim();
  const isUsername = /^@[A-Za-z0-9_]{4,}$/.test(contact);
  const isPhone = /^\+?[0-9][0-9 ()-]{4,}$/.test(contact);
  if (!isUsername && !isPhone) {
    await ctx.reply("Укажите телефон или @username, чтобы менеджер мог с вами связаться.", { reply_markup: contactPrompt() });
    return;
  }
  const chatId = ctx.chat?.id;
  const serviceType = ctx.session.applicationService;
  const requirementsText = ctx.session.applicationRequirements;
  const hasMaterials = ctx.session.applicationHasMaterials;
  if (!chatId || !serviceType || !requirementsText || hasMaterials === undefined) {
    clearForm(ctx);
    await ctx.reply("Данные заявки не сохранились. Начните форму ещё раз.", { reply_markup: serviceKeyboard });
    return;
  }
  const at = applicationClock();
  const timestamp = at.toISOString();
  const record: StoredApplication = {
    id: `${chatId}-${ctx.message.message_id}-${at.getTime().toString(36)}`,
    serviceType,
    requirementsText,
    hasMaterials,
    contactInfo: contact,
    timestamp,
    chatId,
    attachments: ctx.session.applicationAttachments ?? [],
    status: "new",
  };
  const admin = adminChatId(ctx as Ctx & { env?: Record<string, unknown> });
  if (!admin) {
    clearForm(ctx);
    await ctx.reply("Приём заявок пока не настроен. Попробуйте позже или вернитесь в меню.", { reply_markup: inlineKeyboard([[inlineButton("Назад в меню", "menu:main")]]) });
    return;
  }
  const stored = await persistApplication(ctx, record);
  if (!stored) {
    clearForm(ctx);
    await ctx.reply("Не удалось надёжно сохранить заявку. Попробуйте отправить её ещё раз немного позже.", { reply_markup: inlineKeyboard([[inlineButton("Оставить заявку", "application:start")]]) });
    return;
  }
  try {
    await ctx.api.sendMessage(admin, `Новая заявка AI Studio\n\nУслуга: ${serviceType}\nЗадача: ${requirementsText}\nМатериалы: ${hasMaterials ? "есть" : "нужны с нуля"}\nКонтакт: ${contact}\nВложений: ${record.attachments.length}`);
    for (const attachment of record.attachments) {
      await ctx.api.copyMessage(admin, chatId, attachment.messageId);
    }
  } catch {
    clearForm(ctx);
    await ctx.reply("Заявка сохранена, но менеджеру пока не удалось её получить. Откройте меню и попробуйте позже.", { reply_markup: inlineKeyboard([[inlineButton("Назад в меню", "menu:main")]]) });
    return;
  }
  clearForm(ctx);
  await ctx.reply("Спасибо — заявка уже у менеджера AI Studio. Он свяжется с вами по указанному контакту.", { reply_markup: inlineKeyboard([[inlineButton("Назад в меню", "menu:main")]]) });
});

composer.on(["message:photo", "message:document", "message:video"], async (ctx, next) => {
  if (ctx.session.applicationStep !== "requirements") return next();
  const attachment = attachmentFromMessage(ctx);
  const caption = ctx.message.caption?.trim();
  if (!attachment || !caption || caption.length < 10) {
    await ctx.reply("Добавьте к вложению подпись с описанием задачи — минимум 10 символов.");
    return;
  }
  ctx.session.applicationAttachments = [...(ctx.session.applicationAttachments ?? []), attachment];
  ctx.session.applicationRequirements = caption;
  await ctx.reply("У вас есть готовые материалы для проекта?", {
    reply_markup: inlineKeyboard([[inlineButton("Да, есть", "application:materials:yes"), inlineButton("Нет, нужны с нуля", "application:materials:no")], [inlineButton("Отменить", "application:cancel")]]),
  });
});

composer.callbackQuery("application:desk", async (ctx) => {
  if (!(await requireOwner(ctx as unknown as Parameters<typeof requireOwner>[0]))) return;
  await ctx.answerCallbackQuery();
  const records = await readApplications(ctx);
  if (!records) {
    await ctx.reply("Хранилище заявок пока недоступно. Проверьте настройку рабочего окружения.");
    return;
  }
  const view = deskView(records);
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
});

composer.callbackQuery(/^application:status:(.+):(in_progress|done)$/, async (ctx) => {
  if (!(await requireOwner(ctx as unknown as Parameters<typeof requireOwner>[0]))) return;
  await ctx.answerCallbackQuery();
  const [, id, status] = ctx.match;
  if (!(await updateApplicationStatus(ctx, id, status as StoredApplication["status"]))) {
    await ctx.reply("Не удалось обновить статус заявки. Попробуйте ещё раз.");
    return;
  }
  const records = await readApplications(ctx);
  if (!records) {
    await ctx.reply("Статус обновлён, но список пока недоступен.");
    return;
  }
  const view = deskView(records);
  await ctx.editMessageText(view.text, { reply_markup: view.keyboard });
});

export default composer;
