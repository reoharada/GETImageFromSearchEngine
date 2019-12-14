const Config = require('./config.js');
const cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');

const page_num = 10;
const page_offset = 0;

const doRequest = (options) => {
    return new Promise(function (resolve, reject) {
        request(options, function (error, res, body) {
            if (!error && res.statusCode == 200) {
                resolve(body);
            } else {
                reject(error);
            }
        });
    });
};

const getImageData = async (page, images, index) => {
    var options = {
        url: images[index],
        method: 'GET',
        headers: {
            'User-Agent': Config.user_agent,
        },
        encoding: null,
    };
    console.log(index+':'+images[index]);
    await doRequest(options).then((val) => {
        var buf = new Buffer.from(val);
        fs.writeFileSync(Config.query + '/' + Config.query + '_' + page + '_' + index + '.png', buf, 'binary');
        return;
    }).catch((err) => {
        throw new Error(err);
    });
}


const sendRequest = async (page) => {
    var options = {
        url: Config.search_url,
        headers: {
            'User-Agent': Config.user_agent,
        },
        qs: {
            q: Config.query,
            tbm: 'isch',
            ijn: page,
        },
        method: 'GET',
    };
    return await doRequest(options);
};

const parseResponse = async (body) => {
    console.log("スタート");
    var images = [];
    const $ = cheerio.load(body); 
    $('.rg_meta').each(function(index, val){
        images.push(JSON.parse($(val).text())['ou']);
    });
    console.log('画像の数:'+images.length);
    return images;
};

const saveImages = async (page, images) => {
    try {
        if (!fs.existsSync(Config.query)) {
            fs.mkdirSync(Config.query);
        }
        var prms = [];
        for (var i = 0, len = images.length; i < len; i++) {
            prms.push(getImageData(page, images, i));
        }
        await Promise.all(prms).then((res) => {
            console.log("データ保存完了");
        });
        return 0;
    } catch (e) {
        throw new Error(e);
    }
};

var page = page_offset + 1;
const run = async () => {
    for (var i = 0; i < page_num; i++) {
        var page = page_offset + i;
        await sendRequest(page).then((val) => {
            return parseResponse(val);
        }).then((paths) => {
            return saveImages(page, paths);
        }).then((val) => {
            console.log("1 page done");
        }).catch((err) => {
            console.log(err);
        })
    }
};
run().then(() => {console.log('all finished');})

