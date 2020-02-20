# here-plugin-sspai

![Jietu20200216-191022@2x.png](https://i.loli.net/2020/02/16/svhqUfegDZF5acb.png)

> 一个高度配置化的 [here](https://here.app/) 插件，专为 [少数派](http://sspai.com/) 设计

## 安装

### 一键安装  (推荐)
👉 <a href="https://jump.here.app/?installPlugin?title=sspai&url=https://github.com/FriendsOfHere/sspai/releases/latest/download/app.here.sspai.hereplugin">点击这里 🔌</a>

### 手动安装
1. 打开 [releases](https://github.com/FriendsOfHere/sspai/releases/latest/) 页面
2. 下载最新的 release 版本，双击 `app.here.sspai.hereplugin` 即可安装

## 特性
- 显示少数派最新文章
- 不显示已读文章
- 自定义的配置项
- 支持 debug 模式，热键切换
- 友好的 `debug console` 日志展示
- 未读文章提醒
- 动态刷新未读数 (支持 mini window、menu bar、dock)

## 配置项
1. 更新频率 (时间单位: **小时**, 默认:2)
2. 文章拉取数量 (默认值: **10**)
3. Debug 热键绑定切换 (默认值: `cmd+F1`)
4. 未读提醒 (默认: **关闭**)
5. 文章渠道 (当前仅支持 **Matrix**)

## 开发

```console
1. git clone git@github.com:FriendsOfHere/sspai.git .
2. cd sspai && ln -s $(pwd)/app.here.sspai/ /Users/$(whoami)/Library/Application Support/app.here/plugins/app.here.sspai
3. restart `here` or click reload all in `debug console`
```

## Roadmap
- [ ] 增加配置项，支持显示/隐藏已读文章
- [ ] 更多的渠道支持
- [ ] 阅读统计
- [ ] 支持渠道筛选，组合

## License
This plugin is published under the [MIT License](https://opensource.org/licenses/mit-license.php)
