module.exports = {
    // format: https://sspai.com/post/58856
    getPostId: (postLink) => {
        return postLink == undefined ? '' : _.last(_.split(postLink, '/'))
    }

}



