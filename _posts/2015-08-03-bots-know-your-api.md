---
title: "Bot Revolution. Know your API or die hard."
date: 2015-08-03 00:00:00
layout: "Rock.PostLayout"
permalink: "/bots/know-your-api"
categories:
  - telegram
  - bots
  - go
---

**All posts of the series.**

1. [Gentle introduction to Telegram Bots.](/bots/introduction)
2. [Bot Revolution. Know your API or die hard.](/bots/know-your-api)
3. [Start coding some simple bots.](/bots/coding-simple-bot)
4. [Let's keep coding more bots.](/bots/coding-complex-bot)

---

Hello Friend, it's good to see you again. Did you made your homework? Did you readed the two links? If don't, go read it now to full understand this post.

The links that I'm talking are the [Bot introduction to developers](https://core.telegram.org/bots) and the [Telegram Bot API](https://core.telegram.org/bots/api). Open this links in another tabs or window and let's talk about it!

## Bot Introduction

This post starts explaining what can you do with bots, and they give better examples that the one I writed in my last post, my favourites are "Create custom tools" and "Build single and multiplayer games".

The bots don't work in a normal account, they have a special `Bot` account, this accounts don't have phone number, have to be created with @BotFather (we'll see how in other post), and you don't have to use MTProto, you will have an API to use this bots. This is great because you don't have to use MTProto, but sucks too because you don't have full functionality.

#### Nice things of Bots.

- The status is `bot`, no timestamp showing the last connection.
- Once you process the messages, they are removed from server.
- The bots can't start talking with users/chats, they have to start the communication.
- The username ends with `bot`

#### GREAT things of Bots.

- Keyboard: The bot accounts can send/remove custom keyboards, this is really nice to force the user to send the interactions that you want, really useful for simplify interaction or to build games (I saw a TicTacToe bot the other day that uses a keyboard for the layout!)
- Commands: The main way to communicate with the bot are with the commands, the commands ALWAYS start with `/`, and you can use up to 32 characters to build the command. Examples of commands are: `/help` and `/play thisgame`, you can set a base list of commands with @BotFather and will show in a special menu and autocomplete. When in group, you can send a command to a single bot mentioning after the command: `/help@awesomebot`
- Start: When a user start talking with a bot, the first thing that is sended is `/start`, with an optional parameter using `Deep Linking`. How to use Deep Linking? You can give an user a link to start talking with your bot, that looks like: `http://telegram.me/usernamebot`, you can force the parameter with `http://telegram.me/usernamebot?start=PAYLOAD`. If you use the first way, when the user press the Start button it will send `/start`, if you use the second way it will send `/start PAYLOAD` automatically. This is really great for authentication :)
- Privacy mode: This is one of my favourites features, this is a mode that can be enabled or disabled, by default is enabled. If you have it enabled you will only receive `commands` (messages that start with `/`, and if the command have the @usernamebot will be sended only to that bot), messages that mention your bot (@usernamebot), replies to your bot messages and service messages (user enter/leave a group, ...). If you have the privacy disabled the bot will receive all messages. I really love to have privacy mode enabled, in that way the bot receive way long less messages, and gives security to the users, because the privacy mode can be seen in the user list, so you can know if a bot have access to all your messages.

#### BotFather

I've mentioned @BotFather, you can talk to him in [http://telegram.me/botfather](http://telegram.me/botfather).

The first thing is create the user sending him the command `/newbot` and answering his questions (name, username, ...), it will give you a token that you will have to use when you build your bot logic. You can always get the token again with the `/token` command or `/revoke` to change the token.

The bot have more commands like `/setuserpic` or `/setcommands`, check the original post to see them!

Did you created the token? If no, go and do it!

- Create a bot:
  ![Create a bot token](/images/go-bots/create_bot.png)

- Revoke the key:
  ![Revoke key token](/images/go-bots/revoke_bot.png)

The token is the one he say, in the images `120665297:AAGmLR8B43VsPQQ3P99oVTCHehUXkC_Y2s4` and `120665297:AAHacmu0S7RzqY4BKnnSBlcKoh8_UpyKh94` when revoked.

P.D: Don't try to use that tokens, are already revoked ;-)

## Bot API

Do you remember the `token` that @BotFather gived to you when you created the bot? You are going to use it here, I will use `<token>` to represent it.

The URL to make the request are `https://api.telegram.org/bot<token>/METHOD_NAME`. The methods support `GET` and `POST`, if you do `GET` and the method take parameters you will have to use `URL query string`, if you use `POST` you can use `URL query string`, `x-www-form-urlencoded` or `multipart/form-data` (for upload media you need to use multipart).

All the responses when you call this methods are JSON, an `ok` boolean field that explains if the request were well or don't. If `ok` is false, there will be other two fields, `error_code` and `description`. If the requests gone well and `ok` is true, there will be one more field, `result` with the data that you wanted.

```javascript
// Good result
{
    ok: true,
    result: []
}
// Bad result example
{
    ok: false,
    error_code: 401,
    description: "Error: Unauthorized"
}
```

### Types

This are the `types` or `schemas` that the JSON and the data you send will need to follow. This are the fields that you need to search if you want the data.

You can see all the types [here](https://core.telegram.org/bots/api#available-types).

For example, if you want to get the message id, you see the Message type that have a message_id field that is an integer, just grab it.

Or, if you want to get the chat id of a message to answer him, you need the chat field in the message, and inside that chat, the id field.

```javascript
// Message:
{
    message_id: 97,
    // ...
}

// Chat id:
{
    chat: {
        id: 11,
        // ...
    }
    // ...
}
```

If you are developing a library that communicates with the API, make sure that have this types well known, if don't, just read them when you need it :)

### Methods!

This are the methods that you can call in the telegram API to do something. They are pretty self-explained, and the libraries usually have wrappers, so you can just use the methods the library provide. But is great that you know what methods are and the possibilities.

`Note: "user" here refers to a single user or a chat.`

- `getMe`: Returns the information of the bot. Useful to know if the token is right.
- `sendMessage`: Send a message to some user.
- `forwardMessage`: Forward some message from some user to another.
- `sendPhoto`: Send a photo to a user, uploaded from disk or with an id (already uploaded photo)
- `sendAudio`: The same as photo but with an audio.
- `sendDocument`: The same as photo but with a document.
- `sendSticker`: The same as photo but with a sticker.
- `sendVideo`: The same as photo but with a video.
- `sendLocation`: Send a location (latitud and longitude)
- `sendChatAction`: Send an action that is showed in the bot status (typing, sending photo, ...)
- `getUserProfilePhotos`: Get the information about all the photos a user had have.
- `getUpdates`: Get the update messages directly
- `setWebhook`: Set a webhook URL.

The last two are the most weird, but the most important! Let's talk about it!

## A simple architecture of a bot.

So... How is a simple workflow of a bot?

A bot works like a server, is waiting for messages, and when a message arrives, just do something, answer a text, save in DB, send some photo, whatever you want.

To send things to the user, the methods to call are pretty obvius, the "send*" methods (sendMessage, sendPhoto, ...).

But, how do we get the messages? You have two options, really differents!

Using a webhook, or using the getUpdates method.

Let's start with the easiest one, `getUpdates`

### getUpdates method

This is really simple, you just need to do a GET petition to the getUpdates method, and it will return you a list with the messages.

- `getUpdates` without messages:

```javascript
{
    "ok": true,
    "result": []
}
```

- `getUpdates` with one message:

```javascript
{
    "ok": true,
    "result": [{
        "update_id": 967681107,
        "message": {
            "message_id": 73,
            "from": {
                "id": 15738534,
                "first_name": "Rock",
                "last_name": "Neurotiko",
                "username": "rock_neurotiko"
            },
            "chat": {
                "id": 15738534,
                "first_name": "Rock",
                "last_name": "Neurotiko",
                "username": "rock_neurotiko"
            },
            "date": 1438429763,
            "text": "Hi lovely readers! <3"
        }
    }]
}
```

You can test it simply by going to the url, replacing `<token>` with the token @BotFather gived to you: `https://api.telegram.org/bot<token>/getUpdates`

Notice that if you call to "getUpdates" again, and again, the messages are not removed! To get the messages after the last one (so you don't process every time the same messages), you need to use the `offset` parameter (read the documentation of the library you are using). The offset need to be setted as the last `update_id` you received plus one. For example, in the previously message, the `update_id` are 967681107, so I need to set the offset as `967681107 + 1 = 967681108`

Using the offset is needed, when you use the offset, all previous messages are erased. But not only because that, it's because the getUpdates have a limit of 100 messages, if you don't use the messages and the messages grow up to 100, you won't get the newer messages.

So... Use the offset! (to try in browser, just add at the end of the url `?offset=number`, eg: `https://.../getUpdates?offset=967681108`)

Another thing, really important. As you can see, the answer is inmediate, that means that if you don't have messages you are going to asking the server many, many times just for nothing. This are petitions that you are doing for not getting anything. To solve that, the great telegram engineers let you use a technique called [`long-polling`](https://en.wikipedia.org/wiki/Push_technology#Long_polling), that emulates push notifications but using GET petitions.

This is done just by openining a connection and not returning to you the result unless some interesting result comes or some timeout lead to the end.

In the telegram API you can use this!! Like the offset parameter, you can use the `timeout` parameter to set the long-polling. You can set any integer, but in my experience, they answer after 20 seconds even if you asked for more.

In the browser, just add the parameter to the offset one: `?offset=number&timeout=20`, eg: `https://.../getUpdates?offset=967681108&timeout=20`

If you do it in the browser you will see that the tab tries to load, and after 20 seconds will return the empty array of messages (if you didn't have any messages or used the offset properly), but, if you reload again, and talk to your bot, the server will return you the messages inmediatly =D

Summary for `getUpdates`: Use `offset` and `timeout` parameters!

### Webhook method

In this way you don't have to do any GET petition, telegram will send you the messages instead.

You need a server with a domain and SSL verified (this is really important, you can't use a self-signed SSL), and you expose some url. I usually use some path like `/bot/<token>`, so no one will can send fake messages to me, because they would need to know my token.

So, if your domain is `https://example.org`, you want telegram to send you the messages to `https://example.org/bot/<token>`.

To say telegram that you want that, you need to call the method `setWebhook` with that URL and start the server.

Telegram will send you the messages one by one to that URL, just like a normal web server :)

### What way do I choose?

That depends to you and what you want, if you are going to have many requests, you should use the webhook, it can handle better many messages, and it's faster. The webhook are real PUSH data.

If you are not going to have 50 requests/second, you can use getUpdates if you prefer.

Also, if you don't have a web server with domain and verified SSL, you will have to use the getUpdates.

My suggestion are: If you have domain and SSL, use webhook, if don't, use getUpdates. When you are testing, use getUpdates :)

## See you!

So, that's all for today. In the next posts we'll probably be implementing some simple bots, so you can see how easy is with a nice API library.
