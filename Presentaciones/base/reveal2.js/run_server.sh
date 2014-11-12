PORT=8001
if [ $# = 1 ]; then
    PORT=$1
fi

if [[ ! $(cat /etc/sysctl.conf) =~ .*fs.inotify.max_user_watches=524288.* ]]; then
    echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
fi

grunt serve --port $PORT
