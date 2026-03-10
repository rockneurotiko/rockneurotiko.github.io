---
title: "Gentle introduction to Telegram Bots."
date: 2015-07-21 00:00:00
layout: "Rock.PostLayout"
permalink: "/bots/introduction"
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

Hello there, I don't know who you are, so let's start with a simple presentation, because this is my first post in my blog (yay! after 1 year ^^), and probably this is your first post reading here. I'll start with the presentation, you can do the same in the comments section ^^.

I'm `Rock Neurotiko`, 23 years old, Spanish and I'm studying the Computer Engineering career.

I started the career loving `Python`, and hating `Java`.

Now, four years after, I love many languages, the first ones that have comed to my mind are: `Scala`, `Haskell`, `TypeScript`, `Go`, `Ponylang`, `Elm`, `Julia`, ...

`Python` has been relegated to a second place.

I still hate `Java` but `Perl`, `Ruby` and `PHP` has joined to my hated languages.

But stop talking about me, let's start talk about `Telegram` and `Bots`, I'm pretty sure that is why you are here.

![One does not simply write a Telegram Bot Meme](/images/go-bots/simply-write.jpg)

At first, let's see some "definitions" (by myself).

- `Telegram`: Telegram is an instant messaging system, multi-platform, focused in the security and privacy of the users.
- `Bot`: A bot it's a computer program that perform some operations automatically.

The first question could be: "Why a bot in Telegram?". Well, the bots let you automate things and makes your life easier. For example, if you want to send an image to a friend, or search an image of something, instead of open a web-browser and search for an image, you can talk to a bot and tell him: `Image of <something>`, and he returns you an image of that!

This is a really simple bot, but can be as complex as you want, for example, a bot that connects with a programmable coffee pot and you set the time and type of coffee to make =D

The power of telegram is that you don't have it only in your phone, you have it in your phone, in your computers, in your tablets, in every computer that you take. I use it every day, and I use the bots to help me in my day to day.

In every instant messaging system that I know, the people always try to make bots, and Telegram is not an exception.

The main communication with Telegram servers are with a binary protocol invented by them, it's called MTProto, you can see [here](https://core.telegram.org/mtproto) the specification and all the links.

So, if you wanted to build a bot, you needed to communicate with the telegram servers using mtproto, and you had two options (as far as I know), do it manually in your language, or use [tg](https://github.com/vysheng/tg/).

`tg` is a telegram terminal client for Unix systems (now they have compatibility with windows using cygwin), is writed in C, and the magic is that they have a library wrapper for Lua! What does it means? It means that you can program your bots using Lua, without worrying about mtproto!

So, at the beginning (almost) all the bots were builted with `tg` and Lua (they added support for Python and json output later). The most popular bot was (and maybe still are) [telegram-bot](https://github.com/yagop/telegram-bot/) by [@yagop](https://github.com/yagop), telegram-bot is a multi-purpose bot based on plugins.

You can take a look at that project, it have so many plugins, and so good!

You have to configure the bot in a real telegram account, with a phone number, and it looks like a normal user, because it's a normal user! (actually you can log with the same number in another client and see all the messages).

It worked pretty well, and it's really powerful. Telegram saw it too, and they decided to create a Bot API so people can build the bots in their favourite language without using mtproto (and more improvements over traditional bots).

They released it in mid-june (if my memory don't fail), and it was a really surprise, at least to the people in the telegram-bot development group.

They opened the `Bot Revolution` as they call it with a [blog post](https://telegram.org/blog/bot-revolution) and released some bots builted in the platform's Beta (listed in the [blog-post](https://telegram.org/blog/bot-revolution)).

That post is really great, but don't help too much to the developers, lucky of us they released two more pages, the [introduction for developers](https://core.telegram.org/bots) and the [API specification](https://core.telegram.org/bots/api).

This two links are really needed to continue developing bots (knowing programming too!).

We are going to close this post here, with the homework of reading the [introduction for developers](https://core.telegram.org/bots) and the [API specification](https://core.telegram.org/bots/api) before the next post (I don't know when will be).

I almost forgot, you should start learning [Go](http://golang.org/), it will be the language that I will be using ;-)

If you know some programming, you can see the video [Learn Go in one video](http://www.youtube.com/watch?v=CF9S4QZuV30), it's really great explained!

If you don't know some programming... well, I guess that you should search in google to learn programming first ;-)

Cheers, and may the Bot be with you.
