const sspai = {
    // format: https://sspai.com/post/58856
    getPostId: (postLink) => {
        return postLink == undefined ? '' : _.last(_.split(postLink, '/'))
    },
    formatLinkByPostId: (postId) => {
        return "https://sspai.com/post/" + postId
    },
    getUnreadFeeds: (feeds, readIds) => {
        return _.filter(feeds, (item, index) => !_.includes(readIds, getPostId(item.link)))
    },
    getMatrixData: () => {
        // replace rsshub feeds with directly api call, cause limit size not work in feeds.
        // return here.parseRSSFeed('https://rsshub.app/sspai/matrix?limit=30')
        //     .then( (feed) => {
        //         return feed
        //     })
        //     // .catch( (err) => { console.error("error from feeds" + err) })
        return http.get("https://sspai.com/api/v1/articles?offset=0&limit=30&is_matrix=1&sort=matrix_at&include_total=false")
            .then( (body) => {
                const json = body.data
                // console.log(json)
                if (json == undefined) {
                    console.error("JSON result from sspai matrix api undefined");
                    return null
                }
                //format same result as rss feeds
                return {
                    "items": _.map(json["list"], (item, index) => {
                        // console.log(item["id"])
                        // console.log(sspai.formatLinkByPostId(item["id"]))
                        return {
                            link: sspai.formatLinkByPostId(item["id"]),
                            title: item["title"]
                        }
                    })
                }
            })
            // .catch( (err) => { console.error("error from api: " + err) })
    },
    getHomepageData: () => {
        return http.get("https://sspai.com/api/v1/article/index/page/get?limit=30&offset=1&created_at=0")
            .then( (body) => {
                const json = body.data
                // console.log(json)
                if (json == undefined) {
                    console.error("JSON result from sspai homepage api undefined");
                    return null
                }
                //format same result as rss feeds
                return {
                    "items": _.map(json["data"], (item, index) => {
                        // console.log(item["id"])
                        // console.log(sspai.formatLinkByPostId(item["id"]))
                        return {
                            link: sspai.formatLinkByPostId(item["id"]),
                            title: item["title"]
                        }
                    })
                }
            })
            // .catch( (err) => { console.error("error from api: " + err) })
    }

}

module.exports = sspai



