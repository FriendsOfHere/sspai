const _ = require("lodash")
const cache = require('cache')
const hotkey = require('hotkey')
const net = require("net")
const pref = require("pref")

const {getPostId, getUnreadFeeds} = require('./sspai.js')
const {getUpdateFrequency, getFetchArticleNum, isDebugMode, isUnreadNotifyOpen, getDebugHotkey} = require('./tool.js')


function updateData() {
    const LIMIT = getFetchArticleNum()
    console.log("获取更新文章数:" + LIMIT)

    here.setMiniWindow({ title: "Fetching…" })
    here.parseRSSFeed('https://rsshub.app/sspai/matrix')
    .then((feed) => {
        //basic check
        if (feed.items.length <= 0) {
            return here.setMiniWindow({ title: "No item found." })
        }
        if (feed.items.length > LIMIT) {
            feed.items = feed.items.slice(0, LIMIT)
        }

        //init cache read list
        let cachedPostIds = cache.get('readIds');
        if (cachedPostIds == undefined) {
            console.log("已读列表缓存初始化")
            cache.set('readIds', []);
        } else {
            cachedPostIds = JSON.parse(cachedPostIds);
            const checkUnreadFeedsNum = getUnreadFeeds(feed.items, cachedPostIds).length

            //unread notify
            if (checkUnreadFeedsNum > 0 && isUnreadNotifyOpen()) {
                //debug 模式下，有 debug 通知，避免两个通知干扰，延时通知此消息
                _.delay((unreadNum) => {
                    here.systemNotification("【少数派有新的文章更新啦】", `未读数 ${checkUnreadFeedsNum}`)
                }, isDebugMode() ? 5000 : 1000);
            }
        }

        // render component
        let renderComponent = () => {
            // console.log(JSON.stringify(feed.items[0]));
            let readIds = cache.get('readIds');
            if (readIds == undefined) {
                console.log("已读列表缓存初始化")
                readIds = []
            } else {
                readIds = JSON.parse(readIds);
            }
            console.log("cachedIDs:" + JSON.stringify(readIds))

            //console.log(JSON.stringify(getUnreadFeeds(feed.items, readIds)))

            let unreadFeeds = _.filter(feed.items, (item, index) => !_.includes(readIds, getPostId(item.link)))
            let topFeed = _.head(unreadFeeds)

            console.log(`topFeed: ${topFeed}`)

            here.setMiniWindow({
                onClick: () => {
                    if (topFeed != undefined && topFeed.link != undefined)  { here.openURL(topFeed.link) }
                },
                title: topFeed == undefined ? '暂无最新文章' : `${isDebugMode() ? "🐞" : ""}${topFeed.title}`,
                detail: "少数派文章更新",
                accessory: {
                    badge: unreadFeeds.length + ""
                },
                popOvers: _.map(unreadFeeds,(item, index) => {
                    return {
                        title: isDebugMode() ? `${index + 1}. ${item.title} PID:` + getPostId(item.link) : `${index + 1}. ${item.title}`,
                        onClick: () => {
                            if (item.link != undefined) {
                                // 目前 here 缓存用法类似全局持久化，重启 here 或者 reload 之后缓存不会消失
                                let postId = getPostId(item.link)
                                //filter cached postId
                                if (_.indexOf(readIds, postId) == -1) {
                                    console.log(`cache postId:${postId}`)
                                    readIds.push(postId)
                                    console.log(JSON.stringify(readIds))
                                    cache.set('readIds', readIds);
                                } else {
                                    console.log(`cacheExists:${postId} skip`)
                                }

                                //here.openURL(item.link)
                            }
                        },
                    }
                })
            })

            //未读消息 各个组件同步更新
            here.setMenuBar({
              title: `SSPAI 未读数(${unreadFeeds.length})`
            })

            here.setDock({
                title: unreadFeeds.length.toString(),
                detail: "少数派更新"
            })
        }

        console.log("render component start...")
        renderComponent()

        //移出 popup 的时候 重绘各个组件数据，当前 here 不支持 partial render
        here.onPopOverDisappear(() => {
            console.log("onPopOverDisappear")
            console.log("rerender component start")
            renderComponent()
        })
    })
    .catch((error) => {
        console.error(`Error: ${JSON.stringify(error)}`)
        //TODO 打断重试，暂时不支持
        here.setMiniWindow({ title: "Fetching Failed..." })
    })
}

function initDebugHotKey() {
    //ensure debug switch was initialized closed on every onLoad
    cache.set('debug-hotkey-switch', 0)

    let hotkeySetting = getDebugHotkey();
    if (hotkeySetting == "") return

    console.log(`Hotkey Pref: ${hotkeySetting}`)

    if (!hotkey.assignable(hotkeySetting.split("+"))) {
        here.systemNotification(`【🐞DEBUG热键{${hotkeySetting}} 已绑定其他快捷键】`, "请重新设定或者清空绑定")
        return
    }

    let bindResult = hotkey.bind(hotkeySetting.split("+"), () => {
        console.log(`debug hotkey toggle before: ${cache.get('debug-hotkey-switch')}`)
        //Toggle Debug hotkey, implement use a simple cache switch
        const debugSwitch = cache.get('debug-hotkey-switch')
        const identifier = here.pluginIdentifier()
        if (debugSwitch != undefined && _.toSafeInteger(debugSwitch) == 1) {
            here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 已关闭 DEBUG 模式`)
            cache.set('debug-hotkey-switch', 0)
        } else {
        here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 处于 DEBUG 模式
1. 每次重启或者 reload，缓存会清空
2. 帖子标题增加 POST_ID 方便追溯
`)
            cache.removeAll()
            //ensure debug switch exists
            cache.set('debug-hotkey-switch', 1)
        }
        //rerender
        updateData()
    })

    console.log(`Debug hotkey bindResult: ${bindResult}`)
}


/**
 * onLoad will be called in below scenes
 * - restart here
 * - save plugin pref
 * - reload plugin in Debug Console
 */
here.onLoad(() => {

    //init DEBUG feature
    initDebugHotKey();

    //main flow
    console.log("开始更新数据")
    updateData()
    setInterval(updateData, getUpdateFrequency() * 3600 * 1000);
})

let type = net.effectiveType;
net.onChange((currentType) => {
    console.log("Connection type changed from " + type + " to " + currentType);
    type = currentType;
    if (net.isReachable()) {
        console.log("网络恢复了，重新执行获取数据")
        updateData()
    }
})



