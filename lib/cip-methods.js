var cip = require('cip-js');
var cache = require('memory-cache');
var Q = require('q');

if(process.env.CIP_USERNAME === undefined || process.env.CIP_PASSWORD === undefined) {
    console.log("Please set CIP_USERNAME and CIP_PASSWORD, exiting!");
    process.exit(1);
}

var CIP_USERNAME = process.env.CIP_USERNAME;
var CIP_PASSWORD = process.env.CIP_PASSWORD;

// Cache in 30 s.
var CACHE_TIME = 1000 * 30;

var NatMusConfig = {
    endpoint: "http://cumulus.natmus.dk/CIP/",
    constants: {
        catch_all_alias: "any",
        layout_alias: "web"
    },
    catalog_aliases: {
        "Alle": "ALL",
        "Antiksamlingen": "AS",
        "Bevaringsafdelingen": "BA",
        "Danmarks Middelalder og Renæssance": "DMR",
        "Danmarks Nyere Tid": "DNT",
        "Etnografisk samling": "ES",
        "Frihedsmuseet": "FHM",
        "Den Kgl. Mønt- og Medaljesamling": "KMM",
        "Musikmuseet": "MUM",
        "Etnografisk Samling": "ES",
        "Danmarks Oldtid": "DO",
        "Frilandsmuseet": "FLM"
    }
};

exports.init_session = function init_session() {
    var nm = cache.get('nm');

    var deferred = Q.defer();

    if(nm) {
        deferred.resolve(nm);
    }
    else {
        nm = new cip.CIPClient(NatMusConfig);
	    nm.session_open(
            CIP_USERNAME, CIP_PASSWORD,
            function() {
                cache.put('nm', nm, CACHE_TIME);
                deferred.resolve(nm);
            },
            function() {
                deferred.reject(nm);
            }
        );
    }

    return deferred.promise;
};

exports.get_catalogs = function get_catalogs(nm) {
    var catalogs = cache.get('catalogs');

    var deferred = Q.defer();

    if(catalogs) {
        deferred.resolve(catalogs);
    }
    else {
	    nm.get_catalogs(function(catalogs) {
            if(catalogs === null) {
                deferred.reject();
            } else {
                cache.put('catalogs', catalogs, CACHE_TIME);
                deferred.resolve(catalogs);
            }
        });
    }

    return deferred.promise;
};

exports.get_recent_assets = function get_recent_assets(nm, catalog, expr, callback) {
    var search_string = '"Record Modification Date" >= ' + expr;
    nm.criteriasearch({catalog: catalog}, search_string, null, callback);
};

exports.get_asset = function get_asset(nm, catalog, id, callback) {
    var id_string = 'ID is "' + id + '"';

    var asset = cache.get('asset_' + catalog + '_' + id);

    if(!asset) {
        nm.criteriasearch({catalog: {alias: catalog}}, id_string, null, function(result) {
            if(result === null) {
                callback(null);
            }
            else {
                result.get(1, 0, function(returnvalue) {
                    if(returnvalue !== null) {
                        cache.put('asset_' + catalog + '_' + id,
                                  returnvalue, CACHE_TIME);
                    }
                    callback(returnvalue);
                });
            }
        });

    }
    else {
        callback(asset);
    }
};

exports.find_catalog = function find_catalog(catalogs, alias) {
    for(var i=0; i < catalogs.length; ++i) {
        if(catalogs[i].alias === alias) {
            return catalogs[i];
        }
    }

    return null;
};

exports.get_related_assets = function get_related_assets(asset, relation) {
    // TODO: Assert that asset is a CIPAsset object.
    var deferred = Q.defer();
    if(asset && relation) {
        asset.get_related_assets(relation, deferred.resolve);
    } else {
        deferred.reject("The asset or relation was not provided.");
    }
    return deferred.promise;
}