#!/usr/bin/python

import time
import locale
import tweepy

# http://pythonhosted.org/tweepy/html/index.html

conskey = "jh6W7qu0TcaCsY4Jx47f9Q"
conssec = "JNdPLc5LP5LzVaMnJhYohrjYXv2lgXiGfVfZ7DY"
acctok = "189555880-dWPwm1A59Md85VAsad08joDUJGO8qUzwpgEuiACT"
acctoksec = "Ws7X4otoIi0By9MrlV0b5VaVtVRMwrojpcLtoKLcgOq6E"

auth = tweepy.OAuthHandler(conskey, conssec)
auth.set_access_token(acctok, acctoksec)

api = tweepy.API(auth)

twt = api.user_timeline(count=1)[0]
print(dir(twt))
print(twt.text)
print(twt.extended_entities['media'])

[
    {'expanded_url': 'http://twitter.com/BinaryRock/status/594080722933174272/photo/1',
     'display_url': 'pic.twitter.com/haxdl41j1n',
     'url': 'http://t.co/haxdl41j1n',
     'media_url_https': 'https://pbs.twimg.com/tweet_video_thumb/CD6ZRMwW8AAAOak.png',
     'video_info': {'aspect_ratio': [35, 22],
                    'variants': [{'url': 'https://pbs.twimg.com/tweet_video/CD6ZRMwW8AAAOak.mp4',
                                  'bitrate': 0,
                                  'content_type': 'video/mp4'}]},
     'id_str': '594080721620365312',
     'sizes': {'small': {'h': 213,
                         'resize': 'fit',
                         'w': 340},
               'large': {'h': 220,
                         'resize': 'fit',
                         'w': 350},
               'medium': {'h': 220, 'resize':
                          'fit', 'w': 350},
               'thumb': {'h': 150,
                         'resize': 'crop',
                         'w': 150}},
     'indices': [13, 35],
     'type': 'animated_gif',
     'id': 594080721620365312,
     'media_url': 'http://pbs.twimg.com/tweet_video_thumb/CD6ZRMwW8AAAOak.png'}]
