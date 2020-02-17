const pref = require("pref")
const _ = require("lodash")
const net = require("net")
const cache = require('cache')
const {getPostId} = require('./sspai.js')

function updateData() {
    const LIMIT = getFetchArticleNum()
    console.log("获取更新文章数:" + LIMIT)

    here.setMiniWindow({ title: "Fetching…" })
    here.parseRSSFeed('https://rsshub.app/sspai/matrix')
    .then((feed) => {
        if (feed.items.length <= 0) {
            return here.setMiniWindow({ title: "No item found." })
        }

        if (feed.items.length > LIMIT) {
            feed.items = feed.items.slice(0, LIMIT)
        }

        // console.log(JSON.stringify(feed.items[0]));
        let readIds = cache.get('readIds');
        if (readIds == undefined) {
            console.log("未读列表缓存初始化")
            readIds = [];
        } else {
            readIds = JSON.parse(readIds);
        }
        console.log(typeof readIds)
        console.log(JSON.stringify(readIds))

        const topFeed = feed.items[0]
        const nomoreFlag = _.includes(readIds, getPostId(topFeed.link))

        // Mini Window
        here.setMiniWindow({
            onClick: () => { if (topFeed.link != undefined && !nomoreFlag)  { here.openURL(topFeed.link) } },
            title: nomoreFlag ? '暂无最新文章' : topFeed.title,
            detail: "少数派文章更新",
            accessory: {
                badge: _.filter(feed.items, (item, index) => !_.includes(readIds, getPostId(item.link))).length + ""
            },
            popOvers: _.chain(feed.items)
            .filter((item, index) => !_.includes(readIds, getPostId(item.link)))
            .map((item, index) => {
                return {
                    title: isDebugMode() ? `${index + 1}. ${item.title} PID:` + getPostId(item.link) : `${index + 1}. ${item.title}`,
                    onClick: () => {
                        if (item.link != undefined) {
                            // 目前 here 缓存用法类似全局持久化，重启 here 或者 reload 之后缓存不会消失
                            // cache post_id
                            // https://sspai.com/post/58856
                            // console.log(cache.get('read_ids'))
                            // console.log(JSON.stringify(cache.get('read_ids')))
                            let postId = getPostId(item.link)
                            //filter already cached postId
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
            .value()
        })

        here.onPopOverAppear(() => {
            console.log("onPopOverAppear")
        })

        //移出 popup 的时候 更新未读数量
        here.onPopOverDisappear(() => {
            console.log("onPopOverDisappear")
            // here.setMiniWindow({
            //     accessory: {
            //         badge: '小猫咪'
            //     },
            // })
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

function getUpdateFrequency() {
    const DEFAULT_MIN_FREQUENCY = 2
    const DEFAULT_MAX_FREQUENCY = 48

    let updateFenquency = _.toSafeInteger(pref.get("update-frequency"))
    if (!_.isNumber(updateFenquency) || updateFenquency <= 0 || updateFenquency > DEFAULT_MAX_FREQUENCY) {
        here.systemNotification("配置更新", "更新频率时间格式错误，将使用默认更新频率(" + DEFAULT_MIN_FREQUENCY +"h)")
        return DEFAULT_MIN_FREQUENCY
    }

    console.log("获取更新频率:" + updateFenquency + "h")
    return updateFenquency
}

function getFetchArticleNum() {
    const PAGE_MAP = [10, 15, 20]

    return PAGE_MAP[_.toSafeInteger(pref.get("article-num"))]
}

function isDebugMode() {
    return _.toSafeInteger(pref.get("debug-mode")) == 1
}

here.onLoad(() => {
    //DEBUG notify
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



