function isBlank(value) {
    return _.isEmpty(value) && !_.isNumber(value) || _.isNaN(value)
}
_.mixin({ isBlank })

module.exports = {
    getUpdateFrequency: () => {
        const DEFAULT_MIN_FREQUENCY = 2
        const DEFAULT_MAX_FREQUENCY = 48

        let updateFenquency = _.toSafeInteger(pref.get("update-frequency"))
        if (!_.isNumber(updateFenquency) || updateFenquency <= 0 || updateFenquency > DEFAULT_MAX_FREQUENCY) {
            here.systemNotification("配置更新", "更新频率时间格式错误，将使用默认更新频率(" + DEFAULT_MIN_FREQUENCY +"h)")
            return DEFAULT_MIN_FREQUENCY
        }

        debug("[Read PREF] 更新频率:" + updateFenquency + "h")
        return updateFenquency
    },
    getFetchArticleNum: () => {
        const PAGE_MAP = [10, 15, 20]
        const articleNumConf = pref.get("article-num")
        //default num
        if (articleNumConf == undefined) {
            return 10
        }
        return PAGE_MAP[_.toSafeInteger(articleNumConf["index"])]
    },
    getMenuBarStyleName: () => {
        const menuStyleConf = pref.get("menuBar-icon-style")
        debug("[Read PREF] menuBarIconIndex:" + _.toSafeInteger(menuStyleConf["index"]))
        //default style
        if (menuStyleConf == undefined) {
            return "menuBarIcon1.png"
        }
        return "menuBarIcon" + (_.toSafeInteger(menuStyleConf["index"]) + 1) + ".png"
    },
    isDebugMode: () => {
        return _.toSafeInteger(cache.get("debug-hotkey-switch")) == 1
    },
    isUnreadNotifyOpen: () => {
        const unreadConf = pref.get("unread-notify")
        if (unreadConf == undefined) {
            return false
        }
        return _.toSafeInteger(unreadConf["index"]) == 1
    },
    getDebugHotkey: () => {
        return pref.get("debug-hotkey")
    },
    getExpertMode: () => {
        return pref.get("expert-mode")
    },
    debug: (log, isMainFlow = false, override = false) => {
        let span = ""
        if (!isMainFlow) {
            // span = "    "
            // span = "|----"
            span = "|____"
        } else {
            span = "[MAIN]→ "
        }

        if (override) {
            console.log(log)
        } else {
            console.log(`${span}${log}`)
        }
    },
}



