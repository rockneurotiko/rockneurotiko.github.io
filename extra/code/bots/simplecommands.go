package main

import "github.com/rockneurotiko/go-tgbot"

func start(bot tgbot.TgBot, msg tgbot.Message, text string) *string {
	// The text to send!
	answertext := `Welcome to @tutorialbot
This are the current commands:
- /help
- /start`

	// You can send it with this line instead of returning the pointer to the text.
	// bot.Answer(msg).Text(answertext).End()

	// The string pointer that we return, if it's not nil or empty string, it will be sended to the sender.
	return &answertext
}

func help(bot tgbot.TgBot, msg tgbot.Message, text string) *string {
	// The text to send!
	answertext := `Currently this is just a sample bot.
The commands available are:
- /help
- /start

@tutorialbot by @rock_neurotiko version 0.0.1`

	// Send it replying the message
	bot.Answer(msg).Text(answertext).ReplyToMessage(msg.ID).End()
	return nil
}

func main() {
	// Create a new bot with the token
	bot := tgbot.New("YourBotToken")

	// Add a handler for the commands (Note the dot at the end of the first SimpleCommandFn to chain the handlers)
	bot.SimpleCommandFn(`start`, start).
		SimpleCommandFn(`help`, help)

	// Start the bot using getUpdates method
	bot.SimpleStart()
}
