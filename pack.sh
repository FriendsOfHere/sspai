#!/bin/bash

echo -e "packing start"
echo -e "Clean last build"
rm -rf *.hereplugin
echo -e "Compressing to current dir"
zip -r app.here.sspai.zip . -x ".*"
mv app.here.sspai.zip SSPai.hereplugin
echo -e "packing done.."
