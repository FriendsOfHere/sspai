# here-plugin-sspai

![Jietu20200216-191022@2x.png](https://i.loli.net/2020/02/16/svhqUfegDZF5acb.png)

> A highly configurable [here](https://here.app/) plugin for [sspai](http://sspai.com/).

[中文说明](./readme_zh.md)

## Installation

### One Click  (Recommend)
👉 <a href="https://jump.here.app/?installPlugin?title=sspai&url=https://github.com/FriendsOfHere/sspai/releases/latest/download/app.here.sspai.hereplugin">Click Here 🔌</a>

### Manually
1. go [releases](https://github.com/FriendsOfHere/sspai/releases/latest/) page
2. download the latest release & double click the `app.here.sspai.hereplugin`

## Features
- Show latest articles from sspai
- Cache read articles
- Custom settings
- Support debug mode, trigger by hotkey
- Readable debug console log
- Unread notification
- Dynamic unread num (mini window、menu bar、dock)

## Configurations
1. Update frequency (time unit: **h**)
2. Article fetch num (default: **10**)
3. Debug hotkey binding (default: `cmd+F1`)
4. Unread notification (default: **close**)
5. Article channels (**Matrix**)

## Development

```console
1. git clone git@github.com:FriendsOfHere/sspai.git .
2. cd sspai && ln -s $(pwd)/app.here.sspai/ /Users/$(whoami)/Library/Application Support/app.here/plugins/app.here.sspai
3. restart `here` or click reload all in `debug console`
```

## Roadmap
- [ ] add setting for show/hide read articles
- [ ] more channel support
- [ ] read statistics
- [ ] channel filter

## License
This plugin is published under the [MIT License](https://opensource.org/licenses/mit-license.php)
