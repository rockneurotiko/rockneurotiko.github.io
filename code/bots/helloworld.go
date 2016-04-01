package main

import "github.com/rockneurotiko/go-tgbot"

func sayhelloworld(bot tgbot.TgBot, msg tgbot.Message) {
	// This is a beauty way of sending messages ^^
	bot.Answer(msg).Text("Hello World!").End()
}

func main() {
	// Create a new bot with the token
	bot := tgbot.New("YourBotToken")

	// Add a handler for all messages
	bot.AnyMsgFn(sayhelloworld)

	// Start the bot using GetUpdates method
	bot.SimpleStart()
}
