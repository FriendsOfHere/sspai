#!/bin/bash

echo -e "packing start"
echo -e "Clean last build"
rm -rf *.hereplugin
echo -e "Compressing to current dir"
zip -r app.here.sspai.zip app.here.sspai -x *.DS_Store*
mv app.here.sspai.zip app.here.sspai.hereplugin
echo -e "packing done.."
