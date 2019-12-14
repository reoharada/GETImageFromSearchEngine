const Config = require('./config.js');
const cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');

const page_num = 10;
const page_offset = 0;
const tag = Config.query.replace(' ', '_');

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

const runProc = (page) => {
    return new Promise(function (resolve, reject) {
        sendRequest(page).then((val) => {
            return parseResponse(page, val);
        }).then((paths) => {
            return saveImages(page, paths);
        }).then((val) => {
            console.log(" === 1 page finished: page_" + page + " ===");
            resolve("ok");
        }).catch((err) => {
            console.log(err);
            resolve("ng");
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
        fs.writeFileSync(tag + '/' + tag + '_' + page + '_' + index + '.png', buf, 'binary');
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

const parseResponse = async (page, body) => {
    console.log(" === start: page_" + page + " ===");
    var images = [];
    const $ = cheerio.load(body); 
    $('.rg_meta').each(function(index, val){
        images.push(JSON.parse($(val).text())['ou']);
    });
    console.log(' === #images: '+images.length + " ===");
    return images;
};

const saveImages = async (page, images) => {
    try {
        if (!fs.existsSync(tag)) {
            fs.mkdirSync(tag);
        }
        var prms = [];
        for (var i = 0, len = images.length; i < len; i++) {
            prms.push(getImageData(page, images, i));
        }
        await Promise.all(prms).then((res) => {
            console.log(" === saving images done: page_" + page + " ===");
        });
        return 0;
    } catch (e) {
        throw new Error(e);
    }
};

const run = async () => {
    var procs = [];
    for (var i = 0; i < page_num; i++) {
        const page = page_offset + i;
        procs.push(runProc(page));
    }
    await Promise.all(procs).then((res) => {
        var suc = 0;
        for (var i = 0, len = res.length; i < len; i++) {
            if (res[i] == "ok") {
                suc++;
            }
        }
        console.log(" === completely success " + suc + " pages ===");
    });
    return 0;
};
run().then(() => {
    console.log(" === all pages finished ===");
});

