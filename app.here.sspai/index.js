const pref = require("pref")
const _ = require("lodash")
const net = require("net")
const cache = require('cache')
const {getPostId} = require('./sspai.js')
const {getUpdateFrequency, getFetchArticleNum, isDebugMode} = require('./tool.js')

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

        // Mini Window
        let renderMiniwindow = () => {
            // console.log(JSON.stringify(feed.items[0]));
            let readIds = cache.get('readIds');
            if (readIds == undefined) {
                console.log("已读列表缓存初始化")
                readIds = [];
            } else {
                readIds = JSON.parse(readIds);
            }
            console.log("cachedIDs:" + JSON.stringify(readIds))

            let unreadFeeds = _.filter(feed.items, (item, index) => !_.includes(readIds, getPostId(item.link)))
            let topFeed = _.head(unreadFeeds)

            console.log(`topFeed: ${topFeed}`)

            here.setMiniWindow({
                onClick: () => {
                    if (topFeed != undefined && topFeed.link != undefined)  { here.openURL(topFeed.link) }
                },
                title: topFeed == undefined ? '暂无最新文章' : topFeed.title,
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

                                // here.openURL(item.link)
                            }
                        },
                    }
                })
            })

        }

        console.log("render miniwindow start...")
        renderMiniwindow()

        //移出 popup 的时候 重绘 miniwindow，当前 here 不支持 partial render
        here.onPopOverDisappear(() => {
            console.log("onPopOverDisappear")
            console.log("rerender miniwindow start")
            renderMiniwindow()
        })

        //dock TODO

        //menubar TODO
    })
    .catch((error) => {
        console.error(`Error: ${JSON.stringify(error)}`)
        //TODO 打断重试，暂时不支持
        here.setMiniWindow({ title: "Fetching Failed..." })
    })
}

here.onLoad(() => {
    //DEBUG mode notify
    if (isDebugMode()) {
        let identifier = here.pluginIdentifier()
        here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 处于 DEBUG 模式
1. 每次重启或者 reload，缓存会清空
2. 帖子标题增加 POST_ID 方便追溯
`)
        console.log('清除全部缓存')
        cache.removeAll()
    }
    
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



