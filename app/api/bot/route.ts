export const runtime = 'edge'; // Обязательно для Workers/Pages!

import { Bot, webhookCallback } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в настройках!");

const bot = new Bot(token);

// Команда /start
bot.command("start", (ctx) => {
    return ctx.reply("🏰 Добро пожаловать в Цитадели!\n\nНажми кнопку ниже, чтобы открыть игру на 5 игроков.", {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🚀 Начать игру",
                        // СЮДА НУЖНО БУДЕТ ВСТАВИТЬ ССЫЛКУ ПОСЛЕ ДЕПЛОЯ
                        web_app: { url: "https://your-project.pages.dev" }
                    }
                ]
            ]
        }
    });
});

export const POST = webhookCallback(bot, "std/http");