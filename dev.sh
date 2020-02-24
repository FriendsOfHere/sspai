#!/bin/bash

# quit here first
osascript -e 'quit app "Here"'

echo -e "deleting sspai plugin"
rm -rf ~/Library/Application\ Support/app.here/plugins/app.here.sspai/

echo -e "link to dev version"
ln -s $(pwd)/src/ ~/Library/Application\ Support/app.here/plugins/app.here.sspai

echo -e "link done.. restart here"
osascript -e 'tell application "here" to activate'
