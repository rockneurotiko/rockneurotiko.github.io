#!/usr/bin/python

import time
import tweepy
import pickle
# http://pythonhosted.org/tweepy/html/index.html

old_foll = []
new_foll = []

conskey = "jh6W7qu0TcaCsY4Jx47f9Q"
conssec = "JNdPLc5LP5LzVaMnJhYohrjYXv2lgXiGfVfZ7DY"
acctok = "189555880-dWPwm1A59Md85VAsad08joDUJGO8qUzwpgEuiACT"
acctoksec = "Ws7X4otoIi0By9MrlV0b5VaVtVRMwrojpcLtoKLcgOq6E"


auth = tweepy.OAuthHandler(conskey, conssec)
auth.set_access_token(acctok, acctoksec)

api = tweepy.API(auth)

BASE_URL = "https://twitter.com/intent/user?user_id=%s"

print "Cargada la API de " + api.me().name

with open("followers.txt", "rb") as f:
    try:
        oldFollowers = pickle.load(f)
    except:
        oldFollowers = []


ids = []
for page in tweepy.Cursor(api.followers_ids, screen_name="BinaryRock").pages():
    ids.extend(page)
    time.sleep(60)
with open("followers.txt", "wb") as f:
    pickle.dump(ids, f)

for i in oldFollowers:
    if i not in ids:
        old_foll.append(i)
for i in ids:
    if i not in oldFollowers:
        new_foll.append(i)
print "-" * 20
print "Total de seguidores:", len(ids)
print "-" * 20
print "Total de seguidores perdidos:", len(old_foll)
if len(old_foll) > 0:
    with open("old_followers.txt", "a") as f:
        # Poner fecha en f
        for i in old_foll:
            print "\t", BASE_URL % i
            # Guardar en f
            f.write(i)
print "-" * 20
print "Total de seguidores ganados:", len(new_foll)
if len(new_foll) > 0:
    with open("new_followers.txt", "a") as f:
        # Poner fecha en f
        for i in new_foll:
            print "\t", BASE_URL % i
            f.write(i)
            # Guardar en f
# print ids
