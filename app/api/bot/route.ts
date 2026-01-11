import { Bot, webhookCallback } from "grammy";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

bot.command("start", (ctx) => {
    return ctx.reply("Привет! Готов строить город?", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Играть", web_app: { url: "https://твой-сайт.vercel.app" } }]
            ]
        }
    });
});

export const POST = webhookCallback(bot, "std/http");