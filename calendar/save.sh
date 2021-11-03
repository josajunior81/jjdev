#!/bin/bash

#  ./save.sh 202111 http://127.0.0.1:5001/jjdev-2c935/us-central1/app
curl -v -F texts=@$1.texts.txt -F themes=@$1.themes.txt $2/api/calendar
#curl -v -F key=teste -F texts=@$1.texts.txt $2/api/calendar