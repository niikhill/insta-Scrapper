const fetch = require('isomorphic-fetch')

const defaultHeaders = {
    'sec-ch-ua': '"Google Chrome";v="87", " Not;A Brand";v="99", "Chromium";v="87"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'x-ig-app-id': '936619743392459',
    'x-ig-www-claim': 'hmac.AR0A6WzcCoXWstKAUuy1gRbCQFUs8FoZCp3ap2UMk_KQNBSH'
}

const getHeaders = (headers, sessionid, userid) => {
    return Object.assign(headers, {
        cookie: `sessionid=${sessionid}; ds_user_id=${userid}`
    })
}


exports.getStories = ({
    id,
    sessionid,
    userid,
    headers = defaultHeaders
}) => (
    fetch(`https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${id}`, {
        headers: getHeaders(headers, sessionid, userid)
    })
    .then(res => res.json())
    .then(({
        status,
        reels_media: {
            0: stories
        }
    }) => Object.assign({}, {
        status
    }, stories || {
        items: []
    }))
)

exports.getStoriesFeed = ({
    sessionid,
    userid,
    headers = defaultHeaders
}) => (
    fetch(`https://i.instagram.com/api/v1/feed/reels_tray/`, {
        headers: getHeaders(headers, sessionid, userid)
    })
    .then(res => res.json())
)