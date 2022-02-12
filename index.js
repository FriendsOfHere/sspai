const _ = require("lodash")
const cache = require('cache')
const hotkey = require('hotkey')
const net = require("net")
const pref = require("pref")
const i18n = require("i18n")
const http = require('http')
const pb = require('pasteboard')

const {getPostId, getUnreadFeeds, getFeedsWithRead, getMatrixData, getHomepageData} = require('./sspai.js')
const {getUpdateFrequency, getFetchArticleNum, getMenuBarStyleName, isDebugMode, isUnreadNotifyOpen, getDebugHotkey, getExpertMode, debug} = require('./tool.js')

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
    debug("[COMPONENT] miniWindow reloaded. finish title setting")

    // menu bar component display
    const stylePath = "./menubar/" + getMenuBarStyleName();
    debug("menubar style path: " + stylePath);
    here.menuBar.set({
      icon: stylePath,
    })
    here.menuBar.reload()
    debug("[COMPONENT] miniWindow reloaded. finish menubar icon setting")

    //use Promise.all to get all the tab data
    Promise.all([getMatrixData(), getHomepageData()])
        .then( (results) => {
            // console.log(results)
            let matrixData = results[0]
            // console.log(matrixData.items)
            let homepageData = results[1]

            if (matrixData == null && homepageData == null) {
                console.log("all tabs data get null");
                here.miniWindow.set({ title: "Fetching Failed..." })
                return
            }
            debug(`fetchedAPIDataRawSize: matrix-${matrixData.items.length} homepage-${homepageData.items.length}`)
            //basic check
            if ((matrixData.items.length + homepageData.items.length) <= 0) {
                here.miniWindow.set({ title: __("No item found.") })
                return
            }

            //filter homepageData in matrixData
            homepageData.items = _.differenceWith(homepageData.items, matrixData.items, (s, t) => {
                return s.link == t.link
            })
            debug(`filter Homepage duplicate data. remain:${homepageData.items.length}`)
            if (matrixData.items.length > LIMIT) {
                matrixData.items = matrixData.items.slice(0, LIMIT)
            }
            if (homepageData.items.length > LIMIT) {
                homepageData.items = homepageData.items.slice(0, LIMIT)
            }
            debug(`toRenderSize. matrix:${matrixData.items.length} homepage:${homepageData.items.length}`)

            const cachedPostIds = JSON.parse(cache.get('readIds') || '[]');
            const checkUnreadFeedsNum = getUnreadFeeds(
                (getShowExpertSpecificSwitch('index-channel', true)
                    ? _.concat(matrixData.items, homepageData.items)
                    : matrixData.items),
                cachedPostIds).length
            debug("unread total: " + checkUnreadFeedsNum)
            //unread notify
            if (checkUnreadFeedsNum > 0 && IS_UNREAD_NOTIFY_OPEN) {
                //when in debug mode, system notifications will be conflicted
                //delay the unread notification for seconds later
                _.delay((unreadNum) => {
                    here.systemNotification("【少数派有新的文章更新啦】", `未读数 ${checkUnreadFeedsNum}`)
                }, isDebugMode() ? 5000 : 1000);
            }

            // render component
            let renderComponent = () => {
                let readIds = JSON.parse(cache.get('readIds') || '[]');
                debug(`cachedIDs:${JSON.stringify(readIds)}`)

                //TOP Feed set......
                const unreadFeeds = getUnreadFeeds(
                    (getShowExpertSpecificSwitch('index-channel', true)
                    ? _.concat(matrixData.items, homepageData.items)
                    : matrixData.items),
                    readIds)
                let topFeed = _.head(unreadFeeds)
                debug(`topFeed: ${topFeed != undefined ? topFeed.title : ""}`)
                here.miniWindow.set({
                    onClick: () => {
                        //console.log("topfeed is" + JSON.stringify(topFeed))
                        if (topFeed != undefined && topFeed.link != undefined)  {
                            let postId = getPostId(topFeed.link);
                            console.log("get post id:" + postId)
                            //filter cached postId
                            if (_.indexOf(readIds, postId) == -1) {
                                debug(`[click] push postId:${postId} to cache`, false, true);
                                readIds.push(postId);
                                cache.set("readIds", readIds);
                            } else {
                                debug(`cacheExists:${postId} skip`);
                            }

                            if (!isDebugMode()) {
                                here.openURL(topFeed.link);
                                here.miniWindow.hide()
                            }
                        }
                    },
                    title: topFeed == undefined ? '暂无最新文章' : `${isDebugMode() ? "🐞" : ""}${topFeed.title}`,
                    detail: "少数派文章更新",
                    accessory: {
                        badge: unreadFeeds.length + ""
                    }
                })
                here.miniWindow.reload()
                debug("[COMPONENT] miniWindow reloaded.")

                //support multi tab for different channels
                let matrixKey = __("Matrix")
                let homepageKey = __("Homepage")
                const tabRawData = {
                    [matrixKey]: getRenderedData(matrixData.items, readIds),
                    ...(getShowExpertSpecificSwitch('index-channel', true))
                        && {[homepageKey]: getRenderedData(homepageData.items, readIds)},
                }
                // console.log(tabRawData)
                const tabData = _.map(tabRawData, (val, key) => {
                    // console.log("val: " + val + "key:" + key)
                    return {
                        "title": key,
                        "data": formatTabData(val, readIds)
                    }
                })

                //expert mode tab
                if (getExpertMode()) {
                    let expertModeConfig = JSON.parse(cache.get('expert') || '{}')
                    console.log("avatar switch: " + getShowExpertSpecificSwitch('avatar', true))
                    console.log("read switch: " + getShowExpertSpecificSwitch('read', false))
                    console.log("index-channel switch: " + getShowExpertSpecificSwitch('index-channel', true))
                    let expertModeTab = {
                        "title": "⚙️高级设置🤫",
                        "data": [
                            {
                                title: "=================展示配置================="
                            },
                            {
                                title: "是否展示作者头像",
                                accessory: new here.SwitchAccessory({
                                    id: "accessory-avatar",
                                    isOn: getShowExpertSpecificSwitch('avatar', true),
                                    onValueChange: (isOn) => {
                                        console.log(`accessory-avatar isOn: ${isOn}`);
                                        expertModeConfig['avatar'] = isOn ? true : false
                                        // console.log(expertModeConfig)
                                        cache.set('expert', expertModeConfig)
                                        console.log(cache.get('expert'))
                                        here.popover.update(`#accessory-avatar.isOn`, isOn)
                                        here.hudNotification(`avatar switch is ${isOn ? "On" : "Off"}.`);
                                    }
                                }),
                            },
                            {
                                title: "是否展示已读文章",
                                accessory: new here.SwitchAccessory({
                                    id: "accessory-read",
                                    isOn: getShowExpertSpecificSwitch('read', false),
                                    onValueChange: (isOn) => {
                                        console.log(`read isOn: ${isOn}`);
                                        expertModeConfig['read'] = isOn ? true : false
                                        cache.set('expert', expertModeConfig)
                                        console.log(cache.get('expert'))
                                        here.popover.update(`#accessory-read.isOn`, isOn)
                                        here.hudNotification(`read post switch is ${isOn ? "On" : "Off"}.`);
                                    }
                                }),
                            },
                            {
                                title: "是否展示[首页]频道",
                                accessory: new here.SwitchAccessory({
                                    id: "accessory-index-channel",
                                    isOn: getShowExpertSpecificSwitch('index-channel', true),
                                    onValueChange: (isOn) => {
                                        console.log(`index channel isOn: ${isOn}`);
                                        expertModeConfig['index-channel'] = isOn ? true : false
                                        cache.set('expert', expertModeConfig)
                                        console.log(cache.get('expert'))
                                        here.popover.update(`#accessory-index-channel.isOn`, isOn)
                                        here.hudNotification(`index channel switch is ${isOn ? "On" : "Off"}.`);
                                    }
                                }),
                            },
                        ]
                    }
                    if (isDebugMode()) {
                        let debugLineData = [
                            {
                                title: "=================DEBUG================="
                            },
                            {
                                title: "一键清除缓存",
                                accessory: new here.MainTextAccessory({
                                    title: "谨慎使用",
                                }),
                                onClick: () => {
                                    cache.removeAll()
                                    here.hudNotification("Cache info cleared.");
                                    //reset debug mode setting
                                    cache.set('debug-hotkey-switch', 1)
                                }
                            },
                            {
                                title: "一键复制缓存信息",
                                onClick: () => {
                                    pb.setText(JSON.stringify(cache.all()));
                                    here.hudNotification("Cache info copied.");
                                }
                            },
                            {
                                title: "一键清除已读",
                                onClick: () => {
                                    cache.remove("readIds")
                                    here.hudNotification("Read cache cleared.");
                                }
                            },
                        ]

                        let mergeData = expertModeTab.data
                        mergeData.push(...debugLineData)
                    }
                    tabData.push(expertModeTab)
                }

                // console.log("tabData:" + JSON.stringify(tabData))
                here.popover = new here.TabPopover(tabData);
                here.popover.reload()
                debug("[COMPONENT] popover reloaded.")

                // menu bar component display
                // const stylePath = "./menubar/" + getMenuBarStyleName();
                // debug("menubar style path: " + stylePath);
                here.menuBar.set({
                  title: ` ${unreadFeeds.length}`,
                  icon: stylePath,
                })
                // here.menuBar.setIcon(stylePath);
                here.menuBar.reload()
                debug("[COMPONENT] menuBar reloaded.")

                //dock component display
                here.dock.set({
                    title: `${unreadFeeds.length}`,
                    detail: "少数派更新"
                })
                here.dock.reload()
                debug("[COMPONENT] dock reloaded.")
            }

            debug("Render component start...", true)
            renderComponent()

            //rerender component display, partial render is not supported for now
            here.popover.on('close', () => {
                debug("onPopOverDisappear", true)
                debug("Rerender component start")
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

function getShowExpertSpecificSwitch(switchName, notExistsDefaultValue) {
    const expertModeConfig = JSON.parse(cache.get('expert') || '{}')
    if (_.isEmpty(expertModeConfig) || expertModeConfig[switchName] == undefined) return notExistsDefaultValue
    return expertModeConfig[switchName]
}

function getRenderedData(feeds, readIds) {
    const readSwitch = getShowExpertSpecificSwitch('read', false)
    if (readSwitch) {
        return getFeedsWithRead(feeds, readIds)
    }
    return getUnreadFeeds(feeds, readIds)
}

function formatTabData(rawUnreadFeeds, readIds) {
    // console.log(rawUnreadFeeds)
    if (_.isEmpty(rawUnreadFeeds)) {
        return [{title: "Nothing New here."}]
    }
    return _.map(rawUnreadFeeds, (item, index) => {
        // console.log("item detail" + JSON.stringify(item))
        // console.log("item avatar: " + item.avatar)
        return {
            title: isDebugMode()
                ? `${index + 1}. ${item.title} PID:${getPostId(item.link)}`
                : `${index + 1}. ${item.title}`,
            accessory: {
                title: "",
                ...(getShowExpertSpecificSwitch('avatar', true)) && {imageURL: `${item.avatar}`},
                ...(getShowExpertSpecificSwitch('avatar', true)) && {imageCornerRadius: 4}
            },
            onClick: () => {
                if (item.link != undefined) {
                    let postId = getPostId(item.link);
                    //filter cached postId
                    if (_.indexOf(readIds, postId) == -1) {
                        debug(`[click] push postId:${postId} to cache`, false, true);
                        readIds.push(postId);
                        // debug(JSON.stringify(readIds));
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
    // cache.set('debug-hotkey-switch', 0)

    let hotkeySetting = getDebugHotkey();
    if (hotkeySetting == "") return

    debug(`[Read PREF] Hotkey: ${hotkeySetting}`)

    if (!hotkey.assignable(hotkeySetting.split("+"))) {
        here.systemNotification(`【🐞DEBUG热键{${hotkeySetting}} 已绑定其他快捷键】`, "请重新设定或者清空绑定")
        return
    }

    let bindResult = hotkey.bind(hotkeySetting.split("+"), () => {
        //debug mode only available in expert mode
        const identifier = here.pluginIdentifier()
        if (!getExpertMode()) {
            here.systemNotification("【🐞DEBUG模式开启失败】", `必须开启 ${identifier} 的高级模式后才可以使用`)
            return false
        }
        debug('|DEBUG_MODE CHANGED|', false, true)
        debug(`Before: ${cache.get('debug-hotkey-switch')}`)
        //Toggle Debug hotkey, implement use a simple cache switch
        const debugSwitch = cache.get('debug-hotkey-switch')

        if (debugSwitch != undefined && _.toSafeInteger(debugSwitch) == 1) {
            here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 已关闭 DEBUG 模式`)
            cache.set('debug-hotkey-switch', 0)
            debug('After: 0')
        } else {
        here.systemNotification("【🐞DEBUG模式】", `当前 ${identifier} 处于 DEBUG 模式
1. 在高级设置下面会有 Debug 菜单
2. 帖子标题增加 POST_ID 方便追溯
`)
            // cache.removeAll()
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
here.on("load", () => {
    debug("========== Plugin Debug Info Start ==========", false, true)
    debug("↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓", false, true)
    //main flow
    debug(`init debug feature`, true)
    initDebugHotKey();
    debug(`[CURRENT_DEBUG_MODE] ${isDebugMode()}`)
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
