const Config = require('./config.js');
const cheerio = require('cheerio');
var request = require('request');
var async = require('async');
var fs = require('fs');

var page = 0;

var images = [];
var getImageData = function(index, length, handler) {
    if (index == length) {
        handler();
        return;
    }
    var img_request_options = {
        url: images[index],
        method: 'GET',
        headers: {
            'User-Agent': Config.user_agent,
        },
        encoding: null,
    };
    console.log(index+':'+images[index]);
    request.get(img_request_options, function(error, response, body){
        var buffer = new Buffer.from(body);
        fs.writeFileSync(Config.query + '/' + Config.query + '_' + page + '_' + index + '.jpg', buffer, 'binary');
        getImageData(index+1, images.length, handler);
    });
}

var mainThread = function(handler) {
    console.log('ページ:'+page);
    if (page == Config.max_page) {
        handler();
        return;
    }
    async.waterfall([
        function(callback) {
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
            request.get(options, function(error, response, body){
                callback(null, body);
            });
        },
        function(body, callback) {
            console.log("スタート");
            const $ = cheerio.load(body); 
            $('.rg_meta').each(function(index, val){
                images.push(JSON.parse($(val).text())['ou']);
            });
            console.log('画像の数:'+images.length);
            callback(null, images);
        },
        function(images, callback) {
            if (!fs.existsSync(Config.query)) {
                fs.mkdirSync(Config.query);
            }
            getImageData(0, images.length, function(){
                callback(null, 'データ保存完了');
            });
        },
    ], 
    function (err, result){
        console.log(result);
        images = [];
        page++;
        mainThread(handler);
    });
}

mainThread(function(){ console.log('実行完了'); });
