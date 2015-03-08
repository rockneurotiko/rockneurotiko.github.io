#!/usr/bin/python

import time
import locale
import tweepy

# http://pythonhosted.org/tweepy/html/index.html

conskey = "jh6W7qu0TcaCsY4Jx47f9Q"
conssec = "JNdPLc5LP5LzVaMnJhYohrjYXv2lgXiGfVfZ7DY"
acctok = "189555880-dWPwm1A59Md85VAsad08joDUJGO8qUzwpgEuiACT"
acctoksec = "Ws7X4otoIi0By9MrlV0b5VaVtVRMwrojpcLtoKLcgOq6E"

dias = {
    "Monday": ["Lunes", ["@ygwolf", "@Nameri11", "@marsicor"], "cafe"],
    "Tuesday": ["Martes", ["@bara_alex", ], "cafe"],
    "Wednesday": ["Miercoles", ["@theyiyibest", "@AshidaSRS", "@juancano2006"], "cafe"],
    "Thursday": ["Jueves", ["@ErizoAtomico", "@palomatanis"], "nesquik"],
    "Friday": ["Viernes", ["@Mognom1", "@KaMi_Lex"], "cafe"],
    "Saturday": ["Sabado", [], "cafe"],
    "Sunday": ["Domingo", [], "cafe"]
}

# print locale.getlocale(locale.LC_ALL)
locale.setlocale(locale.LC_ALL, "en_US.utf8")     # o "sp" para Windows
# locale.setlocale(locale.LC_ALL,"eng")
t = time.localtime()
dia = time.strftime("%A", t)

tweet = "%s. Arduino, hazme un %s " % (dias[dia][0], dias[dia][-1])

if len(dias[dia][1]) > 0:
    if len(dias[dia][1]) >= 1:
        tweet += "a mi y a "
    else:
        tweet += "a mi "

tweet += ', '.join(dias[dia][1][:-1])
if len(dias[dia][1]) > 1:
    tweet += " y %s " % dias[dia][1][-1]

tweet += "para sobrevivir por favor."

auth = tweepy.OAuthHandler(conskey, conssec)
auth.set_access_token(acctok, acctoksec)

api = tweepy.API(auth)

# print "Cargada la API de " + api.me().name

# Funciona
a = api.update_status(tweet)

# print "Tweeted: " + tweet
