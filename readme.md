# here-plugin-sspai

![Jietu20200216-191022@2x.png](https://i.loli.net/2020/02/16/svhqUfegDZF5acb.png)

> A [here](https://here.app/) plugin for sspai.

## Installation

### 👉 Use .hereplugin (Recommend)
1. go [releases](https://github.com/lifesign/here-plugin-sspai/releases) page
2. download the latest release & double click the `app.here.sspai.hereplugin`

### Manually
```
1. git clone git@github.com:lifesign/here-plugin-sspai.git .
2. cd here-plugin-sspai && ln -s $(pwd)/app.here.sspai/ /Users/{yourName}/Library/Application Support/app.here/plugins/app.here.sspai
3. restart `here` or click reload all in `Debug console`
```

## Roadmap
- [x] 支持获取 matrix 内容
- [x] 支持设置抓取文章条数
- [x] 支持设置更新频率
- [x] 缓存已读内容
- [ ] dock、menubar 支持未读数提醒
- [ ] 配置新未读消息提醒
- [ ] 支持配置快捷键绑定
- [ ] 支持配置展示/隐藏已读内容
- [ ] 支持配置多频道获取内容
- [ ] 筛选频道支持 checkbox 配置，用于选择多个源 (here 官方目前 checkbox 有问题，暂缓)

## License
All plugins are published under the [MIT License](https://opensource.org/licenses/mit-license.php)

