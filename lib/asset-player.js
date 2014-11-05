var config = require('./config/config.js');
var Q = require('q');

function determine_player(asset) {
    if( asset.filename.match('.tif') ||
        asset.filename.match('.jpg') ||
        asset.filename.match('.pdf')) {

        for(c in asset.categories) {
            var category = asset.categories[c];
            if(category.id === config.cip_rotation_category_id) {
                return "image-rotation";
            }
        }
        // If the asset has no significant category, let's use the image-single player.
        return "image-single";
    } else if(asset.filename.match('.mp3')) {
        return "audio";
    } else {
        return false;
    }
}

exports.determine_player = determine_player;

function generate_rotation_sources(req, catalog_alias, original_id, related_assets_ids) {
    var deferred = Q.defer();

    var es = req.app.get('es_client');
    var query = {
        index: 'assets',
        body: {
            ids: []
        }
    };
    for(var i in related_assets_ids) {
        query.body.ids.push(catalog_alias + "-" + related_assets_ids[i]);
    }

    es.mget(query, function(error, response) {
        var asset_ids_sorted = [];
        for(var d in response.docs) {
            var doc = response.docs[d];
            if(doc.found) {
                var filename = doc._source.filename;
                var last_underscore_index = filename.lastIndexOf('_');
                var last_dot_index = filename.indexOf('.');
                if(last_underscore_index > -1 && last_dot_index > last_underscore_index) {
                    var sequence_string = filename.substring(last_underscore_index+1, last_dot_index);
                    var sequence_number = parseInt(sequence_string);
                    asset_ids_sorted[sequence_number] = doc._source.id;
                }
            }
        }
        asset_ids_sorted[0] = original_id;
        var result = {
            small: [],
            large: []
        };

        for(var i in asset_ids_sorted) {
            var asset_id = asset_ids_sorted[i];
            if(asset_id) {
                var image_url = '/' + catalog_alias + '/' + asset_id + '/image/';
                result.small.push(image_url+'1000');
                result.large.push(image_url+'3000');
            }
        }

        deferred.resolve(result);
    });
    return deferred.promise;
}

exports.generate_rotation_sources = generate_rotation_sources;

function generate_sources(req, extras) {
    var deferred = Q.defer();

    var player = extras.player;
    var url = extras.url;
    var filename = extras.filename;

    var sources = {
        download: url + '/download/' + filename,
        image_set: [] // Default is no images.
    };

    if(player === "image-single") {
        var encoded_title = extras.encoded_title;
        sources['image'] = url + '/image/2000/';
        sources['image_set'] = {
            400: url + '/image/400',
            800: url + '/image/800',
            1200: url + '/image/1200',
            2000: url + '/image/2000',
            // Downloads
            download_400: url + '/download/400/' + encoded_title + '.jpg',
            download_800: url + '/download/800/' + encoded_title + '.jpg',
            download_1200: url + '/download/1200/' + encoded_title + '.jpg',
            download_2000: url + '/download/2000/' + encoded_title + '.jpg',
        };
        deferred.resolve(sources);
    } else if(player === "image-rotation") {
        var asset_id = extras.asset_id;
        var catalog_alias = extras.catalog_alias;
        var related_assets_ids = extras.related_assets_ids;
        generate_rotation_sources(req, catalog_alias, asset_id, related_assets_ids)
            .then(function(rotation_sources) {
                sources['image'] = url + '/image/2000/';
                sources['image_rotation_set'] = rotation_sources;
                deferred.resolve(sources);
            });
    } else if(player === "audio") {
        sources['audio'] =  sources.download;
        deferred.resolve(sources);
    }

    return deferred.promise;
}

exports.generate_sources = generate_sources;