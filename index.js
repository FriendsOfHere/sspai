const _ = require("lodash")
const cache = require('cache')
const hotkey = require('hotkey')
const net = require("net")
const pref = require("pref")
const i18n = require("i18n")
const http = require('http')

const {getPostId, getUnreadFeeds, getFromFeeds, getFromApi} = require('./sspai.js')
const {getUpdateFrequency, getFetchArticleNum, getMenuBarStyleName, isDebugMode, isUnreadNotifyOpen, getDebugHotkey, debug} = require('./tool.js')

function updateData() {
    debug(__("update data starting"), true)

    //PREF stuff
    const LIMIT = getFetchArticleNum()
    const IS_UNREAD_NOTIFY_OPEN = isUnreadNotifyOpen()
    debug(`[Read PREF] 更新文章数:${LIMIT}`)
    debug(`[Read PREF] 未读消息提醒:${IS_UNREAD_NOTIFY_OPEN}`)

    //component init render
    here.miniWindow.set({ title: __("Fetching…")})
    here.miniWindow.reload()

    //use Promise.all to get all the tab data
    Promise.all([getFromFeeds(), getFromApi()])
        .then( (results) => {
            //console.log(results)
            let matrixFeed = results[0]
            // console.log(matrixFeed.items)
            let apiResult = results[1]
            if (matrixFeed == null && apiResult == null) {
                console.log("all tabs data get null");
                here.miniWindow.set({ title: "Fetching Failed..." })
                return
            }
            //basic check
            if ((matrixFeed.items.length + apiResult.items.length) <= 0) {
                here.miniWindow.set({ title: __("No item found.") })
                return
            }

            if (matrixFeed.items.length > LIMIT) {
                matrixFeed.items = matrixFeed.items.slice(0, LIMIT)
            }
            if (apiResult.items.length > LIMIT) {
                apiResult.items = apiResult.items.slice(0, LIMIT)
            }

            //init read list cache
            let cachedPostIds = cache.get('readIds');
            if (cachedPostIds == undefined) {
                debug("🚀 已读列表初始化缓存")
                cache.set('readIds', []);
            } else {
                cachedPostIds = JSON.parse(cachedPostIds);
                const checkUnreadFeedsNum = getUnreadFeeds(matrixFeed.items, cachedPostIds).length

                //unread notify
                if (checkUnreadFeedsNum > 0 && IS_UNREAD_NOTIFY_OPEN) {
                    //when in debug mode, system notifications will be conflicted
                    //delay the unread notification for seconds later
                    _.delay((unreadNum) => {
                        here.systemNotification("【少数派有新的文章更新啦】", `未读数 ${checkUnreadFeedsNum}`)
                    }, isDebugMode() ? 5000 : 1000);
                }
            }

    //         // render component
            let renderComponent = () => {
                let readIds = JSON.parse(cache.get('readIds'));
                debug("cachedIDs:" + JSON.stringify(readIds))

                //TOP Feed set......
                let unreadFeeds = getUnreadFeeds(_.merge({}, matrixFeed.items, apiResult.items), readIds)
                let topFeed = _.head(unreadFeeds)
                debug(`topFeed: ${topFeed != undefined ? topFeed.title : ""}`)
                here.miniWindow.set({
                    onClick: () => {
                        if (topFeed != undefined && topFeed.link != undefined)  { here.openURL(topFeed.link) }
                    },
                    title: topFeed == undefined ? '暂无最新文章' : `${isDebugMode() ? "🐞" : ""}${topFeed.title}`,
                    detail: "少数派文章更新",
                    accessory: {
                        badge: unreadFeeds.length + ""
                    }
                })
                here.miniWindow.reload()

                //support multi tab for different channels
                let matrixKey = __("Matrix")
                let homepageKey = __("Homepage")
                const tabRawData = {[matrixKey]: matrixFeed.items, [homepageKey]: apiResult.items}
                // console.log(tabRawData)
                const tabData = _.map(tabRawData, (val, key) => {
                    // console.log("val: " + val + "key:" + key)
                    return {
                        "title": key,
                        "data": formatTabData(val, readIds)
                    }
                })
                // console.log("tabData:" + JSON.stringify(tabData))
                here.popover = new here.TabPopover(tabData);
                here.popover.reload()

                // menu bar component display
                const stylePath = "./menubar/" + getMenuBarStyleName();
                debug("menubar style path: " + stylePath);
                here.menuBar.set({
                  title: `(${unreadFeeds.length})`,
                  icon: stylePath,
                })
                // here.menuBar.setIcon(stylePath);
                here.menuBar.reload()

                //dock component display
                here.dock.set({
                    title: unreadFeeds.length.toString(),
                    detail: "少数派更新"
                })
                here.dock.reload()
            }

            debug("Render component start...")
            renderComponent()

            //rerender component display, partial render is not supported for now
            here.popover.on('close', () => {
                debug("onPopOverDisappear")
                debug("____Rerender component start")
                // here.popover.reload()
                renderComponent()
            })

        })
        .catch( (error) => {
            console.error(`promise all error: ${JSON.stringify(error)}`)
            //TODO interrupt retry ，api not supported
            here.miniWindow.set({ title: "Fetching Failed..." })
        })
}

function formatTabData(rawUnreadFeeds, readIds) {
    // console.log(rawUnreadFeeds)
    // return []
    return _.map(rawUnreadFeeds, (item, index) => {
        // console.log("item detail" + JSON.stringify(item))
        return {
            title: isDebugMode()
                ? `${index + 1}. ${item.title} PID:${getPostId(item.link)}`
                : `${index + 1}. ${item.title}`,
            onClick: () => {
                if (item.link != undefined) {
                    let postId = getPostId(item.link);
                    //filter cached postId
                    if (_.indexOf(readIds, postId) == -1) {
                        debug(`cache postId:${postId}`);
                        readIds.push(postId);
                        debug(JSON.stringify(readIds));
                        cache.set("readIds", readIds);
                    } else {
                        debug(`cacheExists:${postId} skip`);
                    }

                    if (!isDebugMode()) {
                        here.openURL(item.link);
                    }
                }
            },
        };
    })
}

function initDebugHotKey() {
    //ensure debug switch was initialized closed on every onLoad
    cache.set('debug-hotkey-switch', 0)

    let hotkeySetting = getDebugHotkey();
    if (hotkeySetting == "") return

    debug(`[Read PREF] Hotkey: ${hotkeySetting}`)

    if (!hotkey.assignable(hotkeySetting.split("+"))) {
        here.systemNotification(`【🐞DEBUG热键{${hotkeySetting}} 已绑定其他快捷键】`, "请重新设定或者清空绑定")
        return
    }

    let bindResult = hotkey.bind(hotkeySetting.split("+"), () => {
        debug('|DEBUG_MODE CHANGED|', false, true)
        debug(`Before: ${cache.get('debug-hotkey-switch')}`)
        //Toggle Debug hotkey, implement use a simple cache switch
        const debugSwitch = cache.get('debug-hotkey-switch')
        const identifier = here.pluginIdentifier()
        if (debugSwitch != undefined && _.toSafeInteger(debugSwitch) == 1) {
            here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 已关闭 DEBUG 模式`)
            cache.set('debug-hotkey-switch', 0)
            debug('After: 0')
        } else {
        here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 处于 DEBUG 模式
1. 每次重启或者 reload，缓存会清空
2. 帖子标题增加 POST_ID 方便追溯
`)
            cache.removeAll()
            //ensure debug switch exists
            cache.set('debug-hotkey-switch', 1)
            debug('After: 1')
        }
        //rerender
        debug('Rerender component start')
        updateData()
    })

    debug(`Debug hotkey bindResult: ${bindResult}`)
}


/**
 * onLoad will be called in below scenes
 * - restart here
 * - save plugin pref
 * - reload plugin in Debug Console
 */
here.onLoad(() => {
    debug("========== Plugin Debug Info Start ==========", false, true)
    debug("↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓", false, true)
    //main flow
    debug(`init debug feature`, true)
    initDebugHotKey();
    debug(`[DEBUG_MODE] ${isDebugMode()}`)
    updateData()
    setInterval(updateData, getUpdateFrequency() * 3600 * 1000);
})

let type = net.effectiveType;
net.onChange((currentType) => {
    debug("Connection type changed from " + type + " to " + currentType, true);
    type = currentType;
    if (net.isReachable()) {
        console.log(__("net work recovered. execute updating"))
        updateData()
    }
})
